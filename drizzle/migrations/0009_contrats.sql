-- Lot 3 : contrat signé en ligne dès l'enregistrement du client.
--   * le commercial envoie le lien en un clic depuis n'importe quelle facture (avant paiement) ;
--   * un engagement (bon de commande) par facture, au prix de la facture ;
--   * renvoyer le lien réutilise le lien en cours au lieu de l'invalider ;
--   * consentement explicite à la politique de remboursement / désistement, IP enregistrée ;
--   * suivi des contrats non signés pour relancer, statut du contrat visible dans le dossier.

-- ---------------------------------------------------------------------------
-- 1. Colonnes
-- ---------------------------------------------------------------------------
ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS engagements_invoice_id_idx ON public.engagements (invoice_id);

ALTER TABLE public.contract_signature_requests
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminded_at timestamptz;
UPDATE public.contract_signature_requests
SET invoice_id = (prefill->>'invoice_id')::uuid
WHERE invoice_id IS NULL
  AND prefill->>'invoice_id' ~ '^[0-9a-f-]{36}$'
  AND EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = (prefill->>'invoice_id')::uuid);
CREATE INDEX IF NOT EXISTS contract_signature_requests_invoice_idx ON public.contract_signature_requests (invoice_id);

ALTER TABLE public.contract_signatures
  ADD COLUMN IF NOT EXISTS refund_policy_accepted boolean;

ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS contract_status text NOT NULL DEFAULT 'non_envoye';

ALTER TABLE public.dossier_events DROP CONSTRAINT IF EXISTS dossier_events_type_check;
ALTER TABLE public.dossier_events ADD CONSTRAINT dossier_events_type_check CHECK (type IN (
  'creation', 'stage_change', 'daily_update', 'client_contact', 'note',
  'commercial_note', 'blocage', 'deblocage', 'status_change', 'assignment',
  'info_update', 'payment', 'contract'
));

-- Suivi des contrats : factures enregistrées à partir de cette date
INSERT INTO public.app_settings (key, value)
VALUES ('contract_tracking_since', to_jsonb(to_char(current_date - 30, 'YYYY-MM-DD')))
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. État du contrat d'une facture
--    signe | ouvert (lien consulté) | envoye | expire (lien expiré/révoqué) | non_envoye
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoice_contract_state(p_invoice_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH inv AS (
    SELECT id, client_id, client_email, created_at FROM public.invoices WHERE id = p_invoice_id
  ),
  req AS (
    SELECT r.* FROM public.contract_signature_requests r WHERE r.invoice_id = p_invoice_id
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM req WHERE status = 'signed') THEN 'signe'
    -- Contrat signé avant ce lot (depuis la page Clients, sans facture liée) :
    -- vaut pour les factures du même client proches dans le temps.
    -- Un contrat lié à une autre facture ne compte pas (chaque vente a son bon de commande).
    WHEN NOT EXISTS (SELECT 1 FROM req) AND EXISTS (
      SELECT 1
      FROM public.contract_signatures s
      JOIN public.clients c ON c.id = s.client_id
      JOIN inv ON true
      WHERE s.signed_at IS NOT NULL
        AND (c.id = inv.client_id OR lower(c.email) = lower(inv.client_email))
        AND s.signed_at >= inv.created_at - interval '120 days'
        AND NOT EXISTS (
          SELECT 1 FROM public.contract_signature_requests r2
          WHERE r2.id = s.request_id AND r2.invoice_id IS NOT NULL
        )
    ) THEN 'signe'
    WHEN EXISTS (SELECT 1 FROM req WHERE status = 'pending' AND expires_at > now() AND opened_at IS NOT NULL) THEN 'ouvert'
    WHEN EXISTS (SELECT 1 FROM req WHERE status = 'pending' AND expires_at > now()) THEN 'envoye'
    WHEN EXISTS (SELECT 1 FROM req) THEN 'expire'
    ELSE 'non_envoye'
  END;
$$;

REVOKE ALL ON FUNCTION public.invoice_contract_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invoice_contract_state(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Création du lien depuis une facture (sans condition de paiement)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._create_contract_request_from_invoice_impl(
  p_invoice_id uuid,
  p_entity_key text DEFAULT 'kpb_education_ne'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_client record;
  v_client_id uuid;
  v_eng record;
  v_tpl record;
  v_cfg jsonb;
  v_token text;
  v_prefill jsonb;
  v_req_id uuid;
  v_devise text;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  IF p_entity_key NOT IN ('kpb_global_llc', 'kpb_education_ne') THEN
    RAISE EXCEPTION 'entity_key invalide';
  END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;
  IF v_inv.product_code = 'guide_ultime' THEN
    RAISE EXCEPTION 'Pas de contrat pour le Guide ultime';
  END IF;

  -- Client CRM : créé à partir de la facture ; un client existant garde ses informations
  INSERT INTO public.clients (first_name, last_name, email, whatsapp, created_by)
  VALUES (
    trim(v_inv.client_first_name),
    trim(v_inv.client_last_name),
    lower(trim(v_inv.client_email)),
    COALESCE(NULLIF(trim(v_inv.client_whatsapp), ''), 'n/a'),
    auth.uid()
  )
  ON CONFLICT (email) DO UPDATE
  SET whatsapp = CASE
        WHEN public.clients.whatsapp = 'n/a' AND EXCLUDED.whatsapp <> 'n/a' THEN EXCLUDED.whatsapp
        ELSE public.clients.whatsapp
      END,
      updated_at = now()
  RETURNING id INTO v_client_id;

  UPDATE public.invoices SET client_id = v_client_id WHERE id = p_invoice_id AND client_id IS DISTINCT FROM v_client_id;

  SELECT * INTO v_client FROM public.clients WHERE id = v_client_id;

  -- Un bon de commande par facture (prix de la facture), jamais celui d'une autre vente
  SELECT * INTO v_eng FROM public.engagements WHERE invoice_id = p_invoice_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    v_devise := CASE WHEN v_inv.currency IN ('XOF', 'EUR', 'USD') THEN v_inv.currency ELSE 'XOF' END;
    INSERT INTO public.engagements (
      client_id, invoice_id, programme, objectif, prestations_incluses,
      devise, prix_total, frais_inscription, duree_mois,
      sales_rep, status, created_by
    ) VALUES (
      v_client_id, p_invoice_id,
      COALESCE((SELECT label FROM public.procedure_types WHERE code = v_inv.procedure_type), v_inv.service_description),
      CASE WHEN v_inv.includes_visa THEN 'admission_visa' ELSE 'admission' END,
      '{}',
      v_devise, v_inv.amount, 0, 12,
      v_inv.sales_representative::text, 'draft', auth.uid()
    )
    RETURNING * INTO v_eng;
  END IF;

  SELECT * INTO v_tpl FROM public.contract_templates WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun modèle de contrat actif';
  END IF;

  IF v_client.date_naissance IS NULL THEN v_missing := array_append(v_missing, 'date_naissance'); END IF;
  IF COALESCE(trim(v_client.lieu_naissance), '') = '' THEN v_missing := array_append(v_missing, 'lieu_naissance'); END IF;
  IF COALESCE(trim(v_client.nationalite), '') = '' THEN v_missing := array_append(v_missing, 'nationalite'); END IF;
  IF COALESCE(trim(v_client.piece_identite), '') = '' THEN v_missing := array_append(v_missing, 'piece_identite'); END IF;
  IF COALESCE(trim(v_client.adresse), '') = '' THEN v_missing := array_append(v_missing, 'adresse'); END IF;

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
    'entity', '{}'::jsonb,
    'contract_config', COALESCE(v_cfg, '{}'::jsonb),
    'invoice_id', p_invoice_id,
    'missing_client_fields', to_jsonb(v_missing),
    'frozen_at', now()
  );

  -- Un seul lien actif par facture
  UPDATE public.contract_signature_requests
  SET status = 'revoked'
  WHERE invoice_id = p_invoice_id AND status = 'pending';

  v_token := public.generate_signing_token();
  WHILE EXISTS (SELECT 1 FROM public.contract_signature_requests WHERE token = v_token) LOOP
    v_token := public.generate_signing_token();
  END LOOP;

  INSERT INTO public.contract_signature_requests (
    token, client_id, engagement_id, invoice_id, entity_key, template_version, prefill,
    status, created_by, expires_at
  ) VALUES (
    v_token, v_client_id, v_eng.id, p_invoice_id, p_entity_key, v_tpl.version, v_prefill,
    'pending', auth.uid(), now() + interval '30 days'
  )
  RETURNING id INTO v_req_id;

  UPDATE public.engagements
  SET status = 'awaiting_signature', updated_at = now()
  WHERE id = v_eng.id AND status = 'draft';

  RETURN jsonb_build_object(
    'ok', true,
    'reused', false,
    'request_id', v_req_id,
    'token', v_token,
    'client_id', v_client_id,
    'entity_key', p_entity_key,
    'template_version', v_tpl.version,
    'expires_at', now() + interval '30 days',
    'missing_client_fields', to_jsonb(v_missing)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._create_contract_request_from_invoice_impl(uuid, text) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.create_contract_request_from_invoice(uuid, text);
CREATE OR REPLACE FUNCTION public.create_contract_request_from_invoice(
  p_invoice_id uuid,
  p_entity_key text DEFAULT 'kpb_education_ne',
  p_force_new boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_req record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  SELECT user_id INTO v_owner FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (v_owner = auth.uid() AND public.has_role(auth.uid(), 'commercial'::app_role))
  ) THEN
    RAISE EXCEPTION 'Seul le commercial de la facture ou un administrateur peut envoyer ce contrat';
  END IF;

  IF public.invoice_contract_state(p_invoice_id) = 'signe' AND NOT p_force_new THEN
    RAISE EXCEPTION 'Le contrat de cette facture est déjà signé';
  END IF;

  -- Renvoyer = même lien tant qu'il est valide (le client garde son lien)
  IF NOT p_force_new THEN
    SELECT * INTO v_req
    FROM public.contract_signature_requests
    WHERE invoice_id = p_invoice_id AND status = 'pending' AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'reused', true,
        'request_id', v_req.id,
        'token', v_req.token,
        'client_id', v_req.client_id,
        'entity_key', v_req.entity_key,
        'template_version', v_req.template_version,
        'expires_at', v_req.expires_at
      );
    END IF;
  END IF;

  RETURN public._create_contract_request_from_invoice_impl(p_invoice_id, p_entity_key);
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_request_from_invoice(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contract_request_from_invoice(uuid, text, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Signature : consentement remboursement + IP relevée côté serveur
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_contract_request_signature(text, text, text, boolean, text, text, text, text);
CREATE OR REPLACE FUNCTION public.submit_contract_request_signature(
  p_token text,
  p_signer_name text,
  p_signature_image text,
  p_read_and_agreed boolean,
  p_rendered_body text,
  p_contract_hash text,
  p_user_agent text DEFAULT NULL,
  p_signer_ip text DEFAULT NULL,
  p_refund_policy_accepted boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_req record;
  v_client jsonb;
  v_eng jsonb;
  v_sig_id uuid;
  v_existing record;
  v_hash text;
  v_ip text;
BEGIN
  PERFORM public.enforce_contract_rate_limit('contract_token_sign', p_token, 10, 3600);

  IF p_read_and_agreed IS NOT TRUE THEN
    RAISE EXCEPTION 'La case Lu et approuvé est obligatoire';
  END IF;
  -- NULL = ancienne page de signature (avant ce lot) ; false = refus explicite
  IF p_refund_policy_accepted IS FALSE THEN
    RAISE EXCEPTION 'L''acceptation de la politique de remboursement et de désistement est obligatoire';
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

  -- Adresse IP du signataire telle que vue par l'API (preuve de signature)
  BEGIN
    v_ip := NULLIF(trim(split_part(
      COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), '');
    PERFORM v_ip::inet;
  EXCEPTION WHEN others THEN
    v_ip := NULL;
  END;
  v_ip := COALESCE(v_ip, NULLIF(p_signer_ip, ''));

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
      'contract_hash', v_existing.contract_hash,
      'request_id', v_req.id
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
    bon_de_commande, request_id, entity_key, signature_image, refund_policy_accepted
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
    v_ip::inet,
    p_user_agent,
    v_eng,
    v_req.id,
    v_req.entity_key,
    p_signature_image,
    p_refund_policy_accepted
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

REVOKE ALL ON FUNCTION public.submit_contract_request_signature(text, text, text, boolean, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contract_request_signature(text, text, text, boolean, text, text, text, text, boolean) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Suivi des contrats non signés (relances commerciales)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_contract_followups(p_include_signed boolean DEFAULT false)
RETURNS TABLE (
  invoice_id uuid,
  invoice_number text,
  invoice_status text,
  invoice_created_at timestamptz,
  amount numeric,
  currency text,
  client_first_name text,
  client_last_name text,
  client_email text,
  client_whatsapp text,
  sales_representative text,
  owner_user_id uuid,
  contract_state text,
  request_id uuid,
  token text,
  sent_at timestamptz,
  opened_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz,
  reminder_count integer,
  last_reminded_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
  v_since date;
BEGIN
  IF v_uid IS NULL OR NOT (v_admin OR public.has_role(v_uid, 'commercial'::app_role)) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT NULLIF(value #>> '{}', '')::date INTO v_since FROM public.app_settings WHERE key = 'contract_tracking_since';
  v_since := COALESCE(v_since, current_date - 30);

  RETURN QUERY
  WITH base AS (
    SELECT i.*, public.invoice_contract_state(i.id) AS state
    FROM public.invoices i
    WHERE (v_admin OR i.user_id = v_uid)
      AND i.created_at >= v_since
      AND COALESCE(i.product_code, '') <> 'guide_ultime'
  )
  SELECT
    b.id, b.invoice_number, b.status::text, b.created_at, b.amount, b.currency,
    b.client_first_name, b.client_last_name, b.client_email, b.client_whatsapp,
    b.sales_representative::text, b.user_id, b.state,
    r.id, CASE WHEN r.status = 'pending' AND r.expires_at > now() THEN r.token END,
    r.created_at, r.opened_at, r.signed_at, r.expires_at,
    COALESCE(r.reminder_count, 0), r.last_reminded_at
  FROM base b
  LEFT JOIN LATERAL (
    SELECT * FROM public.contract_signature_requests x
    WHERE x.invoice_id = b.id
    ORDER BY (x.status = 'signed') DESC, x.created_at DESC
    LIMIT 1
  ) r ON true
  WHERE p_include_signed OR b.state <> 'signe'
  ORDER BY b.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_followups(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contract_followups(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_contract_reminder(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT i.user_id INTO v_owner
  FROM public.contract_signature_requests r
  JOIN public.invoices i ON i.id = r.invoice_id
  WHERE r.id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien introuvable';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE public.contract_signature_requests
  SET reminder_count = reminder_count + 1, last_reminded_at = now()
  WHERE id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_contract_reminder(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_contract_reminder(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Statut du contrat dans le dossier + journal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_dossier_contract_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id) THEN
    NEW.contract_status := public.invoice_contract_state(NEW.invoice_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_dossier_contract_status ON public.dossiers;
CREATE TRIGGER trg_set_dossier_contract_status
  BEFORE INSERT OR UPDATE OF invoice_id ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.set_dossier_contract_status();

CREATE OR REPLACE FUNCTION public.on_contract_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier record;
  v_state text;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_dossier FROM public.dossiers WHERE invoice_id = NEW.invoice_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_state := public.invoice_contract_state(NEW.invoice_id);
  IF v_state IS DISTINCT FROM v_dossier.contract_status THEN
    UPDATE public.dossiers SET contract_status = v_state, updated_at = now() WHERE id = v_dossier.id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed' THEN
    INSERT INTO public.dossier_events (dossier_id, author_id, type, body, meta, work_date)
    VALUES (v_dossier.id, NULL, 'contract',
            format('Contrat signé en ligne par l''étudiant le %s.', to_char(now() AT TIME ZONE 'Africa/Niamey', 'DD/MM/YYYY à HH24:MI')),
            jsonb_build_object('request_id', NEW.id), public.dossier_work_date());
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO public.dossier_events (dossier_id, author_id, type, body, meta, work_date)
    VALUES (v_dossier.id, auth.uid(), 'contract', 'Lien de signature du contrat envoyé à l''étudiant.',
            jsonb_build_object('request_id', NEW.id), public.dossier_work_date());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contract_request_change ON public.contract_signature_requests;
CREATE TRIGGER trg_contract_request_change
  AFTER INSERT OR UPDATE OF status, opened_at ON public.contract_signature_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_contract_request_change();

-- Reprise : statut des dossiers existants
UPDATE public.dossiers
SET contract_status = public.invoice_contract_state(invoice_id)
WHERE invoice_id IS NOT NULL;
