-- Prérequis des lots 1 à 3 + nouveaux rôles.
--
-- La base de production ne contient qu'une partie de l'historique supabase/migrations :
-- la liste des commerciaux (sales_reps) et toute l'infrastructure des liens de
-- signature de contrat n'y ont jamais été créées. Ce fichier les (re)crée de façon
-- idempotente (sans effet si elles existent déjà), à partir des définitions de
-- l'historique, avant les migrations 0007 à 0009 qui en dépendent.
--
-- Migrations 0006 à 0009 : structure uniquement. Les données de départ
-- (commerciaux, types de procédure, étapes, réglages, reprises) sont dans
-- drizzle/donnees/donnees_initiales.sql, à exécuter juste après.

-- ---------------------------------------------------------------------------
-- 1. Nouveaux rôles (espace Dossiers)
-- ---------------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contractuel';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 2. Commerciaux : liste modifiable (au lieu de l'enum figé sales_rep)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view sales reps" ON public.sales_reps;
CREATE POLICY "Authenticated users can view sales reps"
  ON public.sales_reps FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage sales reps" ON public.sales_reps;
CREATE POLICY "Admins can manage sales reps"
  ON public.sales_reps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_reps TO authenticated;
GRANT ALL ON public.sales_reps TO service_role;

-- La colonne invoices.sales_representative reste du type énuméré sales_rep :
-- chaque commercial ajouté à la liste y est ajouté automatiquement.
CREATE OR REPLACE FUNCTION public.sync_sales_rep_enum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regtype('public.sales_rep') IS NOT NULL
     AND COALESCE(trim(NEW.name), '') <> ''
     AND NOT EXISTS (
       SELECT 1 FROM pg_enum e
       WHERE e.enumtypid = 'public.sales_rep'::regtype AND e.enumlabel = NEW.name
     ) THEN
    EXECUTE format('ALTER TYPE public.sales_rep ADD VALUE IF NOT EXISTS %L', NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_sales_rep_enum() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_sales_rep_enum ON public.sales_reps;
CREATE TRIGGER trg_sync_sales_rep_enum
  AFTER INSERT OR UPDATE OF name ON public.sales_reps
  FOR EACH ROW EXECUTE FUNCTION public.sync_sales_rep_enum();

-- ---------------------------------------------------------------------------
-- 3. Liens de signature de contrat (demandes, statut, jetons)
--    Définitions reprises de supabase/migrations (20260727160000, 20260728093500)
-- ---------------------------------------------------------------------------

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
SET search_path = public, extensions
AS $$
  SELECT translate(
    encode(gen_random_bytes(32), 'base64'),
    '+/',
    '-_'
  );
$$;

-- Limitation des tentatives sur les liens publics
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
SET search_path = public, extensions
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

-- Lecture du contrat par le client (lien public)
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


-- Lien de signature depuis la fiche client (page Clients)
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

-- ---------------------------------------------------------------------------
-- 4. Contrats signés : immuables, sauf l'ajout du PDF archivé
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_signed_contract_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.signed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Signed contract signatures are immutable';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.signed_at IS NOT NULL THEN
    IF current_setting('app.allow_signature_pdf_update', true) = 'true'
       AND NEW.pdf_url IS DISTINCT FROM OLD.pdf_url
       AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id
       AND NEW.contract_hash IS NOT DISTINCT FROM OLD.contract_hash
       AND NEW.signed_at IS NOT DISTINCT FROM OLD.signed_at
       AND NEW.rendered_body IS NOT DISTINCT FROM OLD.rendered_body THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Signed contract signatures are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_signed_contracts ON public.contract_signatures;
CREATE TRIGGER trg_immutable_signed_contracts
  BEFORE UPDATE OR DELETE ON public.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION public.prevent_signed_contract_mutation();

CREATE OR REPLACE FUNCTION public.attach_signature_pdf(p_signature_id uuid, p_pdf_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_signature_pdf_update', 'true', true);
  UPDATE public.contract_signatures SET pdf_url = p_pdf_url WHERE id = p_signature_id;
  PERFORM set_config('app.allow_signature_pdf_update', 'false', true);
END;
$$;

-- Appelée uniquement par la fonction serveur sign-contract (clé service)
REVOKE ALL ON FUNCTION public.attach_signature_pdf(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_signature_pdf(uuid, text) TO service_role;

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

-- PDF signés (bucket privé contract-pdfs, créé par la fonction serveur sign-contract) :
-- dépôt par la fonction serveur uniquement, lecture par l'équipe commerciale
DROP POLICY IF EXISTS "Authenticated can upload contract PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload signed contract PDF" ON storage.objects;
DROP POLICY IF EXISTS "Staff can read contract PDFs" ON storage.objects;
CREATE POLICY "Staff can read contract PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-pdfs'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'commercial'::app_role)
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Droits d'accès des nouvelles tables
--    (écritures publiques uniquement via les fonctions ci-dessus)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_signature_requests TO authenticated;
GRANT SELECT ON public.contract_rate_limit_events, public.contract_token_access_logs TO authenticated;
REVOKE ALL ON public.contract_signature_requests, public.contract_rate_limit_events,
  public.contract_token_access_logs FROM anon;
GRANT ALL ON public.contract_signature_requests, public.contract_rate_limit_events,
  public.contract_token_access_logs TO service_role;
GRANT SELECT ON public.v_contract_status TO service_role;
