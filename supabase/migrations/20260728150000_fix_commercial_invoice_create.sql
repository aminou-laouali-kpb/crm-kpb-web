-- Fix commercial invoice creation blockers observed on production:
-- 1) upsert_client_from_invoice rejected users without admin/commercial
-- 2) invoices.sales_representative still enum (blocks dynamic sales_reps names)
-- 3) pre-invoice contract trigger may still block inserts with client_id
-- 4) sales_reps / invoice sequence / signup role trigger missing on some envs

-- ---------------------------------------------------------------------------
-- 1) Never block invoice generation on contract signature
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_enforce_contract_before_invoice ON public.invoices;
DROP FUNCTION IF EXISTS public.enforce_contract_before_invoice();

-- ---------------------------------------------------------------------------
-- 2) sales_representative: enum -> text (dynamic commercials)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'sales_representative'
      AND udt_name = 'sales_rep'
  ) THEN
    ALTER TABLE public.invoices
      ALTER COLUMN sales_representative TYPE text
      USING sales_representative::text;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Ensure sales_reps table exists (settings UI + invoice dropdown)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_reps ADD COLUMN IF NOT EXISTS email text;

GRANT SELECT ON public.sales_reps TO authenticated;
GRANT ALL ON public.sales_reps TO service_role;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read sales_reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Authenticated users can view sales reps" ON public.sales_reps;
CREATE POLICY "Authenticated users can view sales reps"
  ON public.sales_reps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage sales_reps" ON public.sales_reps;
DROP POLICY IF EXISTS "Admins can manage sales reps" ON public.sales_reps;
CREATE POLICY "Admins can manage sales reps"
  ON public.sales_reps FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.sales_reps (name, active) VALUES
  ('Josphin', true),
  ('Nadia', true),
  ('Donald', true),
  ('Richard', true)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4) Invoice number sequence (frontend falls back to random if missing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE ON public.invoice_sequences TO authenticated;
GRANT ALL ON public.invoice_sequences TO service_role;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can use invoice_sequences" ON public.invoice_sequences;
CREATE POLICY "Authenticated can use invoice_sequences"
  ON public.invoice_sequences FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  INSERT INTO public.invoice_sequences (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'KPB-' || p_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_invoice_number(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Auto-assign commercial on signup + backfill missing roles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'commercial'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Legacy sales_rep -> also commercial
INSERT INTO public.user_roles (user_id, role)
SELECT ur.user_id, 'commercial'::app_role
FROM public.user_roles ur
WHERE ur.role = 'sales_rep'::app_role
ON CONFLICT (user_id, role) DO NOTHING;

-- Anyone who already created invoices should be able to run CRM upsert
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT i.user_id, 'commercial'::app_role
FROM public.invoices i
WHERE i.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6) Permissive client upsert for any authenticated invoice creator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_client_from_invoice(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_whatsapp text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  -- Any authenticated user may upsert the CRM client (same bar as invoice INSERT).
  -- Do not require a prior user_roles row — many commercials lack one in production.

  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email = '' OR COALESCE(trim(p_first_name), '') = '' OR COALESCE(trim(p_last_name), '') = '' THEN
    RAISE EXCEPTION 'Prénom, nom et email sont obligatoires';
  END IF;

  INSERT INTO public.clients (
    first_name,
    last_name,
    email,
    whatsapp,
    created_by
  ) VALUES (
    trim(p_first_name),
    trim(p_last_name),
    v_email,
    COALESCE(NULLIF(trim(p_whatsapp), ''), 'n/a'),
    auth.uid()
  )
  ON CONFLICT (email) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    whatsapp = CASE
      WHEN EXCLUDED.whatsapp IS DISTINCT FROM 'n/a' THEN EXCLUDED.whatsapp
      ELSE public.clients.whatsapp
    END,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_client_from_invoice(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_client_from_invoice(text, text, text, text) TO authenticated;
