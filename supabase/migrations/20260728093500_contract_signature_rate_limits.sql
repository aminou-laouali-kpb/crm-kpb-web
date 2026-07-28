-- Add lightweight DB-backed rate limiting for public contract token flows.

CREATE TABLE IF NOT EXISTS public.contract_rate_limit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_rate_limit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read contract rate limit events" ON public.contract_rate_limit_events;
CREATE POLICY "Admins read contract rate limit events"
  ON public.contract_rate_limit_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS contract_rate_limit_events_scope_identifier_idx
  ON public.contract_rate_limit_events (scope, identifier, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_contract_rate_limit(
  p_scope text,
  p_identifier text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_identifier text;
BEGIN
  v_identifier := encode(digest(COALESCE(p_identifier, ''), 'sha256'), 'hex');

  SELECT count(*)
  INTO v_count
  FROM public.contract_rate_limit_events
  WHERE scope = p_scope
    AND identifier = v_identifier
    AND created_at > now() - make_interval(secs => p_window_seconds);

  IF v_count >= p_limit THEN
    RAISE EXCEPTION 'Trop de tentatives. Réessayez plus tard.';
  END IF;

  INSERT INTO public.contract_rate_limit_events (scope, identifier)
  VALUES (p_scope, v_identifier);
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_contract_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_contract_rate_limit(text, text, integer, integer) TO anon, authenticated;

-- Recreate public token resolution with rate limiting.
CREATE OR REPLACE FUNCTION public.get_contract_request_context(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_tpl record;
  v_sig record;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RAISE EXCEPTION 'Lien de signature invalide';
  END IF;

  PERFORM public.enforce_contract_rate_limit('contract_token_read', p_token, 30, 300);

  SELECT * INTO v_req
  FROM public.contract_signature_requests
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien de signature invalide';
  END IF;

  IF v_req.status = 'revoked' THEN
    RETURN jsonb_build_object('state', 'revoked', 'message', 'Ce lien n''est plus valide');
  END IF;

  IF v_req.status = 'expired' OR v_req.expires_at < now() THEN
    IF v_req.status = 'pending' THEN
      UPDATE public.contract_signature_requests SET status = 'expired' WHERE id = v_req.id;
    END IF;
    RETURN jsonb_build_object(
      'state', 'expired',
      'message', 'Ce lien a expiré, contactez votre conseiller'
    );
  END IF;

  SELECT * INTO v_tpl FROM public.contract_templates WHERE version = v_req.template_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modèle de contrat introuvable';
  END IF;

  IF v_req.status = 'signed' OR v_req.signed_at IS NOT NULL THEN
    SELECT * INTO v_sig FROM public.contract_signatures WHERE id = v_req.signature_id;
    RETURN jsonb_build_object(
      'state', 'signed',
      'token', v_req.token,
      'request_id', v_req.id,
      'entity_key', v_req.entity_key,
      'prefill', v_req.prefill,
      'template', jsonb_build_object('version', v_tpl.version, 'body_md', v_tpl.body_md),
      'signature', CASE WHEN FOUND THEN jsonb_build_object(
        'id', v_sig.id,
        'signer_name', v_sig.signer_name,
        'signed_at', v_sig.signed_at,
        'pdf_url', v_sig.pdf_url,
        'contract_hash', v_sig.contract_hash,
        'template_version', v_sig.template_version
      ) ELSE NULL END
    );
  END IF;

  IF v_req.opened_at IS NULL THEN
    UPDATE public.contract_signature_requests
    SET opened_at = now()
    WHERE id = v_req.id;
  END IF;

  RETURN jsonb_build_object(
    'state', 'pending',
    'token', v_req.token,
    'request_id', v_req.id,
    'entity_key', v_req.entity_key,
    'expires_at', v_req.expires_at,
    'opened_at', COALESCE(v_req.opened_at, now()),
    'prefill', v_req.prefill,
    'template', jsonb_build_object('version', v_tpl.version, 'body_md', v_tpl.body_md)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_request_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_request_context(text) TO anon, authenticated;

-- Recreate public signing submit with rate limiting.
CREATE OR REPLACE FUNCTION public.submit_contract_request_signature(
  p_token text,
  p_signer_name text,
  p_signature_image text,
  p_read_and_agreed boolean,
  p_rendered_body text,
  p_contract_hash text,
  p_user_agent text DEFAULT NULL,
  p_signer_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_client jsonb;
  v_eng jsonb;
  v_sig_id uuid;
  v_existing record;
  v_hash text;
BEGIN
  PERFORM public.enforce_contract_rate_limit('contract_token_sign', p_token, 10, 3600);

  IF p_read_and_agreed IS NOT TRUE THEN
    RAISE EXCEPTION 'La case Lu et approuvé est obligatoire';
  END IF;
  IF COALESCE(trim(p_signer_name), '') = '' THEN
    RAISE EXCEPTION 'Nom du signataire requis';
  END IF;
  IF COALESCE(p_signature_image, '') = '' THEN
    RAISE EXCEPTION 'Signature requise';
  END IF;
  IF p_rendered_body IS NULL OR length(p_rendered_body) < 100 THEN
    RAISE EXCEPTION 'Corps du contrat invalide';
  END IF;
  IF p_contract_hash IS NULL OR length(p_contract_hash) < 32 THEN
    RAISE EXCEPTION 'Hash de contrat invalide';
  END IF;

  v_hash := encode(digest(convert_to(p_rendered_body, 'UTF8'), 'sha256'), 'hex');
  IF lower(v_hash) <> lower(p_contract_hash) THEN
    RAISE EXCEPTION 'Hash de contrat non concordant';
  END IF;

  SELECT * INTO v_req
  FROM public.contract_signature_requests
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien de signature invalide';
  END IF;

  IF v_req.status = 'signed' AND v_req.signature_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.contract_signatures WHERE id = v_req.signature_id;
    RETURN jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'signature_id', v_existing.id,
      'signed_at', v_existing.signed_at,
      'signer_name', v_existing.signer_name,
      'signer_email', v_existing.signer_email,
      'template_version', v_existing.template_version,
      'entity_key', v_existing.entity_key,
      'pdf_url', v_existing.pdf_url,
      'contract_hash', v_existing.contract_hash
    );
  END IF;

  IF v_req.status = 'revoked' THEN
    RAISE EXCEPTION 'Ce lien n''est plus valide';
  END IF;
  IF v_req.status = 'expired' OR v_req.expires_at < now() THEN
    UPDATE public.contract_signature_requests SET status = 'expired' WHERE id = v_req.id AND status = 'pending';
    RAISE EXCEPTION 'Ce lien de signature a expiré';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Lien de signature non disponible';
  END IF;

  v_client := v_req.prefill->'client';
  v_eng := v_req.prefill->'engagement';

  INSERT INTO public.contract_signatures (
    client_id, engagement_id, template_version, contract_hash, rendered_body,
    read_and_agreed, signed_at, signer_name, signer_email, signer_ip, user_agent,
    bon_de_commande, request_id, entity_key, signature_image
  ) VALUES (
    (v_client->>'id')::uuid,
    NULLIF(v_eng->>'id', '')::uuid,
    v_req.template_version,
    lower(v_hash),
    p_rendered_body,
    true,
    now(),
    trim(p_signer_name),
    v_client->>'email',
    NULLIF(p_signer_ip, '')::inet,
    p_user_agent,
    v_eng,
    v_req.id,
    v_req.entity_key,
    p_signature_image
  )
  RETURNING id INTO v_sig_id;

  UPDATE public.contract_signature_requests
  SET status = 'signed',
      signed_at = now(),
      signature_id = v_sig_id
  WHERE id = v_req.id;

  IF v_req.engagement_id IS NOT NULL THEN
    UPDATE public.engagements
    SET status = 'signed', updated_at = now()
    WHERE id = v_req.engagement_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'signature_id', v_sig_id,
    'signed_at', now(),
    'signer_name', trim(p_signer_name),
    'signer_email', v_client->>'email',
    'template_version', v_req.template_version,
    'entity_key', v_req.entity_key,
    'contract_hash', lower(v_hash),
    'request_id', v_req.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contract_request_signature(text, text, text, boolean, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contract_request_signature(text, text, text, boolean, text, text, text, text) TO anon, authenticated;
