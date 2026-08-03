-- Unique sequential invoice numbers: KPB-YYYY-NNNN
-- Seeds from existing invoices so the suite continues without duplicates.
-- Atomic allocation via UPDATE ... RETURNING (safe under concurrency).

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

-- Seed / raise the counter from the highest existing KPB-YYYY-NNNN per year
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

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_year integer DEFAULT NULL)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  v_year := COALESCE(p_year, EXTRACT(YEAR FROM now())::integer);

  -- Sync with any invoices created outside the sequence (legacy / races)
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
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(integer) TO authenticated;

-- Convenience overload without args (current year)
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_next_invoice_number(EXTRACT(YEAR FROM now())::integer);
$$;

REVOKE ALL ON FUNCTION public.get_next_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;
