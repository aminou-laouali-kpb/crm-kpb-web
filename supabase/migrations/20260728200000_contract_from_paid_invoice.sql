-- Contrat après paiement : le commercial envoie le lien de signature
-- directement depuis une facture payée (CRM). Le client complète lui-même
-- ses informations d'identité sur la page de signature.

-- ---------------------------------------------------------------------------
-- 1) Créer une demande de signature à partir d'une facture payée
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_contract_request_from_invoice(
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF p_entity_key NOT IN ('kpb_global_llc', 'kpb_education_ne') THEN
    RAISE EXCEPTION 'entity_key invalide';
  END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;
  IF v_inv.status IS DISTINCT FROM 'paid' THEN
    RAISE EXCEPTION 'Le contrat ne peut être envoyé qu''après paiement de la facture';
  END IF;

  -- Client CRM : créé/mis à jour depuis les champs de la facture
  INSERT INTO public.clients (first_name, last_name, email, whatsapp, created_by)
  VALUES (
    trim(v_inv.client_first_name),
    trim(v_inv.client_last_name),
    lower(trim(v_inv.client_email)),
    COALESCE(NULLIF(trim(v_inv.client_whatsapp), ''), 'n/a'),
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
  RETURNING id INTO v_client_id;

  UPDATE public.invoices SET client_id = v_client_id WHERE id = p_invoice_id;

  SELECT * INTO v_client FROM public.clients WHERE id = v_client_id;

  -- Engagement : réutiliser le plus récent du client, sinon en créer un
  -- depuis les informations de la facture.
  SELECT * INTO v_eng
  FROM public.engagements
  WHERE client_id = v_client_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_devise := CASE WHEN v_inv.currency IN ('XOF', 'EUR', 'USD') THEN v_inv.currency ELSE 'XOF' END;
    INSERT INTO public.engagements (
      client_id, programme, objectif, prestations_incluses,
      devise, prix_total, frais_inscription, duree_mois,
      sales_rep, status, created_by
    ) VALUES (
      v_client_id,
      v_inv.service_description,
      v_inv.service_description,
      '{}',
      v_devise,
      v_inv.amount,
      0,
      12,
      v_inv.sales_representative::text,
      'draft',
      auth.uid()
    )
    RETURNING * INTO v_eng;
  END IF;

  SELECT * INTO v_tpl FROM public.contract_templates WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun modèle de contrat actif';
  END IF;

  -- Champs d'identité que le client complétera sur la page de signature
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

  -- Révoquer les liens en attente pour ce client
  UPDATE public.contract_signature_requests
  SET status = 'revoked'
  WHERE client_id = v_client_id
    AND status = 'pending';

  v_token := public.generate_signing_token();
  WHILE EXISTS (SELECT 1 FROM public.contract_signature_requests WHERE token = v_token) LOOP
    v_token := public.generate_signing_token();
  END LOOP;

  INSERT INTO public.contract_signature_requests (
    token, client_id, engagement_id, entity_key, template_version, prefill,
    status, created_by, expires_at
  ) VALUES (
    v_token, v_client_id, v_eng.id, p_entity_key, v_tpl.version, v_prefill,
    'pending', auth.uid(), now() + interval '30 days'
  )
  RETURNING id INTO v_req_id;

  UPDATE public.engagements
  SET status = 'awaiting_signature', updated_at = now()
  WHERE id = v_eng.id;

  RETURN jsonb_build_object(
    'ok', true,
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

REVOKE ALL ON FUNCTION public.create_contract_request_from_invoice(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contract_request_from_invoice(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Le client complète ses informations d'identité via le lien (token-gated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_contract_request_client_info(
  p_token text,
  p_fields jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_client record;
  v_missing text[] := ARRAY[]::text[];
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
  IF v_req.status <> 'pending' OR v_req.expires_at < now() THEN
    RAISE EXCEPTION 'Ce lien n''est plus valide';
  END IF;

  -- Champs autorisés uniquement (identité du signataire)
  UPDATE public.clients
  SET
    date_naissance = COALESCE(NULLIF(p_fields->>'date_naissance', '')::date, date_naissance),
    lieu_naissance = COALESCE(NULLIF(trim(p_fields->>'lieu_naissance'), ''), lieu_naissance),
    nationalite = COALESCE(NULLIF(trim(p_fields->>'nationalite'), ''), nationalite),
    piece_identite = COALESCE(NULLIF(trim(p_fields->>'piece_identite'), ''), piece_identite),
    adresse = COALESCE(NULLIF(trim(p_fields->>'adresse'), ''), adresse),
    is_minor = COALESCE((p_fields->>'is_minor')::boolean, is_minor),
    representant_legal_nom = COALESCE(NULLIF(trim(p_fields->>'representant_legal_nom'), ''), representant_legal_nom),
    representant_legal_lien = COALESCE(NULLIF(trim(p_fields->>'representant_legal_lien'), ''), representant_legal_lien),
    updated_at = now()
  WHERE id = v_req.client_id;

  SELECT * INTO v_client FROM public.clients WHERE id = v_req.client_id;

  IF v_client.date_naissance IS NULL THEN v_missing := array_append(v_missing, 'date_naissance'); END IF;
  IF COALESCE(trim(v_client.lieu_naissance), '') = '' THEN v_missing := array_append(v_missing, 'lieu_naissance'); END IF;
  IF COALESCE(trim(v_client.nationalite), '') = '' THEN v_missing := array_append(v_missing, 'nationalite'); END IF;
  IF COALESCE(trim(v_client.piece_identite), '') = '' THEN v_missing := array_append(v_missing, 'piece_identite'); END IF;
  IF COALESCE(trim(v_client.adresse), '') = '' THEN v_missing := array_append(v_missing, 'adresse'); END IF;
  IF v_client.is_minor AND COALESCE(trim(v_client.representant_legal_nom), '') = '' THEN
    v_missing := array_append(v_missing, 'representant_legal_nom');
  END IF;

  -- Rafraîchir le prefill gelé de la demande
  UPDATE public.contract_signature_requests
  SET prefill = jsonb_set(
    jsonb_set(
      prefill,
      '{client}',
      jsonb_build_object(
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
      )
    ),
    '{missing_client_fields}',
    to_jsonb(v_missing)
  )
  WHERE id = v_req.id;

  RETURN jsonb_build_object(
    'ok', true,
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
    'missing_client_fields', to_jsonb(v_missing)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_contract_request_client_info(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_contract_request_client_info(text, jsonb) TO anon, authenticated;
