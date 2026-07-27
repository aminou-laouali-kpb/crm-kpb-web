-- Signature Lien Spec: contract_signature_requests, entity_key, CRM view, server RPCs

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Signature requests (shareable links)
CREATE TABLE IF NOT EXISTS public.contract_signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  entity_key text NOT NULL CHECK (entity_key IN ('kpb_global_llc', 'kpb_education_ne')),
  template_version text NOT NULL REFERENCES public.contract_templates(version),
  prefill jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed', 'expired', 'revoked')),
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  opened_at timestamptz,
  signed_at timestamptz,
  signature_id uuid REFERENCES public.contract_signatures(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_signature_requests_client_idx
  ON public.contract_signature_requests (client_id);
CREATE INDEX IF NOT EXISTS contract_signature_requests_status_idx
  ON public.contract_signature_requests (status);
CREATE UNIQUE INDEX IF NOT EXISTS contract_signature_requests_token_uidx
  ON public.contract_signature_requests (token);

ALTER TABLE public.contract_signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage signature requests" ON public.contract_signature_requests;
CREATE POLICY "Staff can manage signature requests"
  ON public.contract_signature_requests FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

-- No direct public SELECT — token resolution goes through SECURITY DEFINER RPCs only

-- 2. Extend contract_signatures
ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.contract_signature_requests(id),
  ADD COLUMN IF NOT EXISTS entity_key text,
  ADD COLUMN IF NOT EXISTS signature_image text;

-- 3. CRM status view
CREATE OR REPLACE VIEW public.v_contract_status
WITH (security_invoker = true)
AS
SELECT
  c.id AS client_id,
  c.first_name AS prenom,
  c.last_name AS nom,
  c.email,
  c.whatsapp AS telephone,
  c.created_by AS client_created_by,
  r.id AS request_id,
  r.token AS request_token,
  r.status AS request_status,
  r.entity_key,
  r.created_by AS request_created_by,
  r.created_at AS link_created_at,
  r.opened_at,
  r.signed_at,
  r.expires_at,
  r.engagement_id,
  s.id AS signature_id,
  s.signer_name,
  s.signer_ip,
  s.pdf_url,
  s.template_version,
  CASE
    WHEN r.signed_at IS NOT NULL OR r.status = 'signed' THEN 'Signé'
    WHEN r.id IS NULL THEN 'Lien non généré'
    WHEN r.status = 'revoked' THEN 'Révoqué'
    WHEN r.expires_at < now() OR r.status = 'expired' THEN 'Lien expiré'
    WHEN r.opened_at IS NOT NULL THEN 'Ouvert, non signé'
    ELSE 'En attente'
  END AS statut_lisible
FROM public.clients c
LEFT JOIN LATERAL (
  SELECT *
  FROM public.contract_signature_requests req
  WHERE req.client_id = c.id
  ORDER BY req.created_at DESC
  LIMIT 1
) r ON true
LEFT JOIN public.contract_signatures s ON s.id = r.signature_id;

GRANT SELECT ON public.v_contract_status TO authenticated;

-- 4. Helpers
CREATE OR REPLACE FUNCTION public.generate_signing_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT translate(
    encode(gen_random_bytes(32), 'base64'),
    '+/',
    '-_'
  );
$$;

CREATE OR REPLACE FUNCTION public.create_signature_request(
  p_client_id uuid,
  p_engagement_id uuid,
  p_entity_key text,
  p_entity jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_eng record;
  v_tpl record;
  v_cfg jsonb;
  v_token text;
  v_prefill jsonb;
  v_req_id uuid;
  v_missing text[] := ARRAY[]::text[];
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

  IF p_entity_key NOT IN ('kpb_global_llc', 'kpb_education_ne') THEN
    RAISE EXCEPTION 'entity_key invalide';
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client introuvable'; END IF;

  SELECT * INTO v_eng FROM public.engagements WHERE id = p_engagement_id AND client_id = p_client_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Engagement introuvable'; END IF;

  SELECT * INTO v_tpl FROM public.contract_templates WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aucun modèle de contrat actif'; END IF;

  IF COALESCE(trim(v_client.first_name), '') = '' OR COALESCE(trim(v_client.last_name), '') = '' THEN
    v_missing := array_append(v_missing, 'nom');
  END IF;
  IF COALESCE(trim(v_client.email), '') = '' THEN v_missing := array_append(v_missing, 'email'); END IF;
  IF v_client.date_naissance IS NULL THEN v_missing := array_append(v_missing, 'date_naissance'); END IF;
  IF COALESCE(trim(v_client.lieu_naissance), '') = '' THEN v_missing := array_append(v_missing, 'lieu_naissance'); END IF;
  IF COALESCE(trim(v_client.nationalite), '') = '' THEN v_missing := array_append(v_missing, 'nationalite'); END IF;
  IF COALESCE(trim(v_client.piece_identite), '') = '' THEN v_missing := array_append(v_missing, 'piece_identite'); END IF;
  IF COALESCE(trim(v_client.adresse), '') = '' THEN v_missing := array_append(v_missing, 'adresse'); END IF;
  IF v_client.is_minor AND COALESCE(trim(v_client.representant_legal_nom), '') = '' THEN
    v_missing := array_append(v_missing, 'representant_legal_nom');
  END IF;

  IF array_length(v_missing, 1) IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'missing_fields', to_jsonb(v_missing),
      'error', 'Champs client manquants'
    );
  END IF;

  SELECT value INTO v_cfg FROM public.app_settings WHERE key = 'contract_config';

  v_prefill := jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client.id,
      'first_name', v_client.first_name,
      'last_name', v_client.last_name,
      'email', v_client.email,
      'whatsapp', v_client.whatsapp,
      'date_naissance', v_client.date_naissance,
      'lieu_naissance', v_client.lieu_naissance,
      'nationalite', v_client.nationalite,
      'piece_identite', v_client.piece_identite,
      'adresse', v_client.adresse,
      'is_minor', v_client.is_minor,
      'representant_legal_nom', v_client.representant_legal_nom,
      'representant_legal_lien', v_client.representant_legal_lien
    ),
    'engagement', jsonb_build_object(
      'id', v_eng.id,
      'programme', v_eng.programme,
      'objectif', v_eng.objectif,
      'etablissements_cibles', v_eng.etablissements_cibles,
      'prestations_incluses', v_eng.prestations_incluses,
      'devise', v_eng.devise,
      'prix_total', v_eng.prix_total,
      'frais_inscription', v_eng.frais_inscription,
      'echeancier', v_eng.echeancier,
      'duree_mois', v_eng.duree_mois
    ),
    'entity_key', p_entity_key,
    'entity', COALESCE(p_entity, '{}'::jsonb),
    'contract_config', COALESCE(v_cfg, '{}'::jsonb),
    'frozen_at', now()
  );

  -- Revoke previous pending links for this client
  UPDATE public.contract_signature_requests
  SET status = 'revoked'
  WHERE client_id = p_client_id
    AND status = 'pending';

  v_token := public.generate_signing_token();
  -- Ensure uniqueness (rare collision)
  WHILE EXISTS (SELECT 1 FROM public.contract_signature_requests WHERE token = v_token) LOOP
    v_token := public.generate_signing_token();
  END LOOP;

  INSERT INTO public.contract_signature_requests (
    token, client_id, engagement_id, entity_key, template_version, prefill,
    status, created_by, expires_at
  ) VALUES (
    v_token, p_client_id, p_engagement_id, p_entity_key, v_tpl.version, v_prefill,
    'pending', auth.uid(), now() + interval '30 days'
  )
  RETURNING id INTO v_req_id;

  UPDATE public.engagements
  SET status = 'awaiting_signature', updated_at = now()
  WHERE id = p_engagement_id;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_req_id,
    'token', v_token,
    'expires_at', now() + interval '30 days',
    'template_version', v_tpl.version,
    'entity_key', p_entity_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_signature_request(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_signature_request(uuid, uuid, text, jsonb) TO authenticated;

-- 5. Public context by text token (sets opened_at)
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

  -- First open
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

-- 6. Server-side submit (recomposes hash via digest; accepts rendered_body that must match recomputed hash from client or edge)
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

  -- Server recomputed hash must match client-provided hash of the same body
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

  -- Idempotence: already signed → return existing
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

-- 7. Invalid invalid token attempts (best-effort)
CREATE TABLE IF NOT EXISTS public.contract_token_access_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token_hint text,
  ip text,
  user_agent text,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_token_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read token access logs" ON public.contract_token_access_logs;
CREATE POLICY "Admins read token access logs"
  ON public.contract_token_access_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_contract_token_access(
  p_token_hint text,
  p_outcome text,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contract_token_access_logs (token_hint, outcome, ip, user_agent)
  VALUES (left(COALESCE(p_token_hint, ''), 12), p_outcome, p_ip, p_user_agent);
END;
$$;

REVOKE ALL ON FUNCTION public.log_contract_token_access(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_contract_token_access(text, text, text, text) TO anon, authenticated;

-- 8. Gate: also block engagement activation without signature
CREATE OR REPLACE FUNCTION public.enforce_contract_before_engagement_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    IF NOT public.client_has_valid_signature(NEW.client_id) THEN
      RAISE EXCEPTION 'Contrat non signé — impossible d''activer la procédure';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_contract_before_engagement_active ON public.engagements;
CREATE TRIGGER trg_enforce_contract_before_engagement_active
  BEFORE UPDATE OF status ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_before_engagement_active();
