-- Invoice-first workflow: contract is required after payment / for procedure start,
-- not before generating the invoice.

-- 1) Remove the pre-invoice signature gate
DROP TRIGGER IF EXISTS trg_enforce_contract_before_invoice ON public.invoices;
DROP FUNCTION IF EXISTS public.enforce_contract_before_invoice();

-- 2) Upsert a CRM client from invoice identity fields (email unique)
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

  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

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
