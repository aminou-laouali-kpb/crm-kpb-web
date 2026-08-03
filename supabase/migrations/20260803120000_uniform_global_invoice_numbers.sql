-- Global uniform invoice numbers for ALL users (not per-commercial).
-- Source of truth = server trigger + shared sequence table.
-- Format: KPB-YYYY-NNNN

CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invoice_sequences TO authenticated;
GRANT ALL ON public.invoice_sequences TO service_role;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can use invoice_sequences" ON public.invoice_sequences;
DROP POLICY IF EXISTS "Authenticated can read invoice_sequences" ON public.invoice_sequences;
CREATE POLICY "Authenticated can read invoice_sequences"
  ON public.invoice_sequences FOR SELECT TO authenticated
  USING (true);

-- Remove PostgREST-ambiguous overloads from earlier migration attempts
DROP FUNCTION IF EXISTS public.get_next_invoice_number();
DROP FUNCTION IF EXISTS public.get_next_invoice_number(integer);
DROP FUNCTION IF EXISTS public.peek_next_invoice_number(integer);

-- Seed counter from the highest existing KPB-YYYY-NNNN (all users, ignores RLS)
INSERT INTO public.invoice_sequences (year, last_number)
SELECT
  (regexp_match(invoice_number, '^KPB-(\d{4})-(\d+)$'))[1]::integer AS year,
  MAX((regexp_match(invoice_number, '^KPB-(\d{4})-(\d+)$'))[2]::integer) AS last_number
FROM public.invoices
WHERE invoice_number ~ '^KPB-\d{4}-\d+$'
GROUP BY 1
ON CONFLICT (year) DO UPDATE
SET
  last_number = GREATEST(public.invoice_sequences.last_number, EXCLUDED.last_number),
  updated_at = now();

-- If there are invoices this year but none in KPB-YYYY-NNNN form, start after total count
-- so new sequential numbers don't "restart at 0001" below historical volume.
INSERT INTO public.invoice_sequences (year, last_number)
SELECT
  EXTRACT(YEAR FROM created_at)::integer AS year,
  COUNT(*)::integer AS last_number
FROM public.invoices
WHERE EXTRACT(YEAR FROM created_at) IS NOT NULL
GROUP BY 1
ON CONFLICT (year) DO UPDATE
SET
  last_number = GREATEST(public.invoice_sequences.last_number, EXCLUDED.last_number),
  updated_at = now();

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_max_existing integer;
  v_next integer;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);

  -- Always sync from ALL invoices (SECURITY DEFINER bypasses RLS)
  SELECT COALESCE(MAX((regexp_match(i.invoice_number, '^KPB-' || v_year || '-(\d+)$'))[1]::integer), 0)
  INTO v_max_existing
  FROM public.invoices i
  WHERE i.invoice_number ~ ('^KPB-' || v_year || '-\d+$');

  INSERT INTO public.invoice_sequences (year, last_number)
  VALUES (v_year, v_max_existing)
  ON CONFLICT (year) DO UPDATE
  SET
    last_number = GREATEST(public.invoice_sequences.last_number, EXCLUDED.last_number),
    updated_at = now();

  UPDATE public.invoice_sequences
  SET last_number = last_number + 1,
      updated_at = now()
  WHERE year = v_year
  RETURNING last_number INTO v_next;

  RETURN 'KPB-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_invoice_number(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(integer) TO authenticated, service_role;

-- Non-consuming preview for the form (same global sequence for every user)
CREATE OR REPLACE FUNCTION public.peek_next_invoice_number(p_year integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_max_existing integer;
  v_last integer;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);

  SELECT COALESCE(MAX((regexp_match(i.invoice_number, '^KPB-' || v_year || '-(\d+)$'))[1]::integer), 0)
  INTO v_max_existing
  FROM public.invoices i
  WHERE i.invoice_number ~ ('^KPB-' || v_year || '-\d+$');

  INSERT INTO public.invoice_sequences (year, last_number)
  VALUES (v_year, v_max_existing)
  ON CONFLICT (year) DO UPDATE
  SET
    last_number = GREATEST(public.invoice_sequences.last_number, EXCLUDED.last_number),
    updated_at = now();

  SELECT last_number INTO v_last
  FROM public.invoice_sequences
  WHERE year = v_year;

  RETURN 'KPB-' || v_year || '-' || lpad((COALESCE(v_last, 0) + 1)::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.peek_next_invoice_number(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peek_next_invoice_number(integer) TO authenticated;

-- Server assigns the number on INSERT → same sequence for every commercial
CREATE OR REPLACE FUNCTION public.assign_invoice_number_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
BEGIN
  v_year := COALESCE(
    EXTRACT(YEAR FROM NEW.invoice_date)::integer,
    EXTRACT(YEAR FROM now())::integer
  );
  -- Always overwrite client-provided numbers so all users share one suite
  NEW.invoice_number := public.get_next_invoice_number(v_year);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_invoice_number ON public.invoices;
CREATE TRIGGER trg_assign_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_invoice_number_before_insert();
