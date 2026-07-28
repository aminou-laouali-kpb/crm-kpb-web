-- Harden contract PDF handling and public signed replay

-- Stop exposing PDF attachment/upload helpers to anonymous callers.
REVOKE ALL ON FUNCTION public.attach_signature_pdf(uuid, text) FROM anon;

DROP POLICY IF EXISTS "Authenticated can upload contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload signed contract PDF" ON storage.objects;

-- Staff can still read stored PDFs; uploads should go through service-role edge functions only.

-- Public helper: resolve a signed contract PDF via the contract token only when the request is signed.
CREATE OR REPLACE FUNCTION public.get_public_contract_pdf_path(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Lien de contrat invalide';
  END IF;

  SELECT r.*, s.pdf_url
  INTO v_req
  FROM public.contract_signature_requests r
  LEFT JOIN public.contract_signatures s ON s.id = r.signature_id
  WHERE r.token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien de contrat invalide';
  END IF;

  IF v_req.status <> 'signed' OR v_req.signature_id IS NULL THEN
    RAISE EXCEPTION 'Contrat non signé';
  END IF;

  IF COALESCE(v_req.pdf_url, '') = '' THEN
    RAISE EXCEPTION 'PDF du contrat indisponible';
  END IF;

  RETURN v_req.pdf_url;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_contract_pdf_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_contract_pdf_path(text) TO anon, authenticated;
