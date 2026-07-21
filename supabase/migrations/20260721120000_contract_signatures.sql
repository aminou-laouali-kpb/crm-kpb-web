-- Contract e-signature: clients, engagements, templates, signatures, tokens, gate

-- 1. Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  date_naissance date,
  lieu_naissance text,
  nationalite text,
  piece_identite text,
  adresse text,
  is_minor boolean NOT NULL DEFAULT false,
  representant_legal_nom text,
  representant_legal_lien text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Link invoices to clients
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON public.invoices (client_id);

-- 3. Engagements (Annexe 1)
CREATE TABLE IF NOT EXISTS public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  programme text NOT NULL,
  objectif text NOT NULL,
  etablissements_cibles text,
  prestations_incluses text[] NOT NULL DEFAULT '{}',
  devise text NOT NULL DEFAULT 'XOF' CHECK (devise IN ('XOF', 'EUR', 'USD')),
  prix_total numeric NOT NULL CHECK (prix_total >= 0),
  frais_inscription numeric NOT NULL DEFAULT 0 CHECK (frais_inscription >= 0),
  echeancier text,
  duree_mois integer NOT NULL DEFAULT 12 CHECK (duree_mois > 0),
  sales_rep text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'awaiting_signature', 'signed', 'active')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage engagements"
  ON public.engagements FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

CREATE TRIGGER update_engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Contract templates
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  body_md text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read templates"
  ON public.contract_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.contract_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Ensure only one active template
CREATE OR REPLACE FUNCTION public.ensure_single_active_contract_template()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.contract_templates
    SET is_active = false
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_active_contract_template
  BEFORE INSERT OR UPDATE OF is_active ON public.contract_templates
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.ensure_single_active_contract_template();

-- 5. Contract signatures
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  engagement_id uuid REFERENCES public.engagements(id),
  template_version text NOT NULL REFERENCES public.contract_templates(version),
  contract_hash text NOT NULL,
  rendered_body text NOT NULL,
  read_and_agreed boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  signer_name text,
  signer_email text,
  signer_ip inet,
  user_agent text,
  pdf_url text,
  bon_de_commande jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_signatures_client_version_idx
  ON public.contract_signatures (client_id, template_version);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read signatures"
  ON public.contract_signatures FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

CREATE POLICY "Staff can insert unsigned signatures"
  ON public.contract_signatures FOR INSERT TO authenticated
  WITH CHECK (
    signed_at IS NULL
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'commercial'::app_role)
    )
  );

-- Immutability: no UPDATE/DELETE once signed (and generally no DELETE)
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
    RAISE EXCEPTION 'Signed contract signatures are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_immutable_signed_contracts
  BEFORE UPDATE OR DELETE ON public.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION public.prevent_signed_contract_mutation();

-- Allow staff to update ONLY unsigned rows (e.g. draft) — still blocked once signed by trigger
CREATE POLICY "Staff can update unsigned signatures"
  ON public.contract_signatures FOR UPDATE TO authenticated
  USING (
    signed_at IS NULL
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'commercial'::app_role)
    )
  );

-- 6. Signing tokens
CREATE TABLE IF NOT EXISTS public.contract_signing_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_signing_tokens_token_idx
  ON public.contract_signing_tokens (token);

ALTER TABLE public.contract_signing_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage signing tokens"
  ON public.contract_signing_tokens FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

-- 7. Valid signature check + invoice gate
CREATE OR REPLACE FUNCTION public.client_has_valid_signature(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contract_signatures cs
    JOIN public.contract_templates ct ON ct.version = cs.template_version AND ct.is_active = true
    WHERE cs.client_id = p_client_id
      AND cs.signed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.client_has_valid_signature(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_has_valid_signature(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_contract_before_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL THEN
    RAISE EXCEPTION 'client_id requis : le client doit être rattaché et avoir signé le contrat';
  END IF;
  IF NOT public.client_has_valid_signature(NEW.client_id) THEN
    RAISE EXCEPTION 'Contrat non signé pour ce client (version active requise)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_contract_before_invoice ON public.invoices;
CREATE TRIGGER trg_enforce_contract_before_invoice
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_before_invoice();

-- 8. Public RPCs for signing flow (token-gated, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_signing_context(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tok record;
  v_client record;
  v_eng record;
  v_tpl record;
  v_cfg jsonb;
BEGIN
  SELECT * INTO v_tok
  FROM public.contract_signing_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien de signature invalide';
  END IF;
  IF v_tok.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ce contrat a déjà été signé';
  END IF;
  IF v_tok.expires_at < now() THEN
    RAISE EXCEPTION 'Ce lien de signature a expiré';
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = v_tok.client_id;
  SELECT * INTO v_eng FROM public.engagements WHERE id = v_tok.engagement_id;
  SELECT * INTO v_tpl FROM public.contract_templates WHERE is_active = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun modèle de contrat actif';
  END IF;

  SELECT value INTO v_cfg FROM public.app_settings WHERE key = 'contract_config';

  RETURN jsonb_build_object(
    'token', v_tok.token,
    'expires_at', v_tok.expires_at,
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
    'template', jsonb_build_object(
      'version', v_tpl.version,
      'body_md', v_tpl.body_md
    ),
    'contract_config', COALESCE(v_cfg, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_signing_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signing_context(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_contract_signature(
  p_token uuid,
  p_contract_hash text,
  p_rendered_body text,
  p_read_and_agreed boolean,
  p_user_agent text DEFAULT NULL,
  p_signer_ip text DEFAULT NULL,
  p_pdf_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tok record;
  v_client record;
  v_eng record;
  v_tpl record;
  v_sig_id uuid;
  v_signer_name text;
BEGIN
  IF p_read_and_agreed IS NOT TRUE THEN
    RAISE EXCEPTION 'La case Lu et approuvé est obligatoire';
  END IF;
  IF p_contract_hash IS NULL OR length(p_contract_hash) < 32 THEN
    RAISE EXCEPTION 'Hash de contrat invalide';
  END IF;
  IF p_rendered_body IS NULL OR length(p_rendered_body) < 100 THEN
    RAISE EXCEPTION 'Corps du contrat invalide';
  END IF;

  SELECT * INTO v_tok FROM public.contract_signing_tokens WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien de signature invalide';
  END IF;
  IF v_tok.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ce contrat a déjà été signé';
  END IF;
  IF v_tok.expires_at < now() THEN
    RAISE EXCEPTION 'Ce lien de signature a expiré';
  END IF;

  SELECT * INTO v_client FROM public.clients WHERE id = v_tok.client_id;
  SELECT * INTO v_eng FROM public.engagements WHERE id = v_tok.engagement_id;
  SELECT * INTO v_tpl FROM public.contract_templates WHERE is_active = true LIMIT 1;

  v_signer_name := trim(v_client.first_name || ' ' || v_client.last_name);

  INSERT INTO public.contract_signatures (
    client_id, engagement_id, template_version, contract_hash, rendered_body,
    read_and_agreed, signed_at, signer_name, signer_email, signer_ip, user_agent,
    pdf_url, bon_de_commande
  ) VALUES (
    v_client.id,
    v_eng.id,
    v_tpl.version,
    p_contract_hash,
    p_rendered_body,
    true,
    now(),
    v_signer_name,
    v_client.email,
    NULLIF(p_signer_ip, '')::inet,
    p_user_agent,
    p_pdf_url,
    jsonb_build_object(
      'programme', v_eng.programme,
      'objectif', v_eng.objectif,
      'etablissements_cibles', v_eng.etablissements_cibles,
      'prestations_incluses', v_eng.prestations_incluses,
      'devise', v_eng.devise,
      'prix_total', v_eng.prix_total,
      'frais_inscription', v_eng.frais_inscription,
      'echeancier', v_eng.echeancier,
      'duree_mois', v_eng.duree_mois
    )
  )
  RETURNING id INTO v_sig_id;

  UPDATE public.contract_signing_tokens SET used_at = now() WHERE id = v_tok.id;
  UPDATE public.engagements SET status = 'signed', updated_at = now() WHERE id = v_eng.id;

  RETURN jsonb_build_object(
    'signature_id', v_sig_id,
    'signed_at', now(),
    'signer_name', v_signer_name,
    'signer_email', v_client.email,
    'template_version', v_tpl.version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contract_signature(uuid, text, text, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_contract_signature(uuid, text, text, boolean, text, text, text) TO anon, authenticated;

-- Allow updating pdf_url after sign via dedicated RPC (signed rows otherwise immutable)
CREATE OR REPLACE FUNCTION public.attach_signature_pdf(p_signature_id uuid, p_pdf_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable immutability for pdf_url only via direct update in SECURITY DEFINER
  -- by using a privileged path: drop trigger briefly is bad; instead store pdf via this function
  -- that bypasses RLS but we need to bypass the trigger too.
  -- Approach: update using a session variable the trigger respects.
  PERFORM set_config('app.allow_signature_pdf_update', 'true', true);
  UPDATE public.contract_signatures SET pdf_url = p_pdf_url WHERE id = p_signature_id;
  PERFORM set_config('app.allow_signature_pdf_update', 'false', true);
END;
$$;

-- Update immutability trigger to allow pdf_url-only updates when flag set
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

REVOKE ALL ON FUNCTION public.attach_signature_pdf(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_signature_pdf(uuid, text) TO anon, authenticated;

-- 9. Storage bucket for signed PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-pdfs', 'contract-pdfs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can read contract PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contract-pdfs'
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'commercial'::app_role)
    )
  );

CREATE POLICY "Authenticated can upload contract PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contract-pdfs');

-- Anon upload for post-sign PDF (path must start with signature id folder — soft check)
CREATE POLICY "Anon can upload signed contract PDF"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'contract-pdfs');

-- 10. Contract config defaults
INSERT INTO public.app_settings (key, value) VALUES
  ('contract_config', '{
    "kpb_forme_juridique": "SARL",
    "kpb_capital": "",
    "kpb_rccm": "",
    "kpb_siege": "Niamey, République du Niger",
    "kpb_representant": "",
    "kpb_fonction": "",
    "kpb_email": "aminou@karatoupourtous.org",
    "ville_juridiction": "Niamey",
    "lieu_signature_defaut": "Niamey",
    "version_contrat": "v1.0",
    "nb_tentatives_reorientation": 1,
    "delai_reorientation_mois": 12,
    "delai_mise_en_demeure_jours": 15,
    "delai_accuse_jours": 3,
    "delai_decision_jours": 15,
    "delai_versement_jours": 30,
    "delai_amiable_jours": 30,
    "frais_inscription_defaut": 0
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- 11. Seed active contract template v1.0
INSERT INTO public.contract_templates (version, body_md, is_active)
VALUES ('v1.0', $contractmd$
# ═══════════ CONTRAT ═══════════

**Référence :** {{version_contrat}} — Fait à {{lieu_signature}}, le {{date_signature}}

**ENTRE LES SOUSSIGNÉS :**

La société **KPB Education**, {{kpb_forme_juridique}}, au capital de {{kpb_capital}} {{devise_symbole}}, immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) sous le numéro {{kpb_rccm}}, dont le siège social est situé à {{kpb_siege}}, Niamey, République du Niger, représentée par {{kpb_representant}} en qualité de {{kpb_fonction}}, dûment habilité(e) aux fins des présentes,
ci-après « **KPB Education** » ou « **le Prestataire** », d'une part,

**ET**

{{client_nom}}, né(e) le {{client_date_naissance}} à {{client_lieu_naissance}}, de nationalité {{client_nationalite}}, titulaire de la pièce d'identité / du passeport n° {{client_piece_identite}}, demeurant à {{client_adresse}}, joignable au {{client_telephone}} et à l'adresse électronique {{client_email}} {{client_representant_legal}},
ci-après « **le Client** », d'autre part,

Ci-après ensemble « **les Parties** ».

**IL A ÉTÉ PRÉALABLEMENT EXPOSÉ CE QUI SUIT :** KPB Education est une agence spécialisée dans l'orientation et l'accompagnement des étudiants dans leurs démarches d'études à l'étranger. Le Client souhaite bénéficier de cet accompagnement en vue d'une admission dans un établissement d'enseignement à l'étranger et de l'obtention du visa correspondant. **CECI EXPOSÉ, IL A ÉTÉ CONVENU CE QUI SUIT :**

### Article 1 — Objet
Le présent Contrat définit les conditions dans lesquelles KPB Education fournit au Client une prestation d'accompagnement en vue de son admission dans un ou plusieurs établissements d'enseignement à l'étranger et de la constitution de son dossier de demande de visa étudiant. Le périmètre précis est décrit à l'Annexe 1.

### Article 2 — Nature de l'obligation : obligation de moyens
**2.1.** KPB Education est tenue d'une **obligation de moyens**, et non d'une obligation de résultat.
**2.2.** KPB Education met en œuvre tout le soin, la diligence et le savoir-faire nécessaires. En revanche, elle **NE GARANTIT PAS** l'obtention d'une admission, l'octroi d'une bourse ni la délivrance d'un visa, ces décisions relevant du seul pouvoir discrétionnaire des établissements et des autorités consulaires ou d'immigration, sur lesquels KPB Education n'a aucun pouvoir.
**2.3.** En conséquence, un refus d'admission, de bourse ou de visa ne constitue pas un manquement de KPB Education et n'ouvre, à lui seul, aucun droit à remboursement, sous réserve de l'Article 7.

### Article 3 — Description des prestations
**3.1. Prestations incluses.** Selon le périmètre retenu à l'Annexe 1 : évaluation du profil et orientation ; conseil dans le choix des établissements et formations ; aide à la constitution et à la vérification du dossier de candidature (pièces, traductions, rédaction/relecture de la lettre de motivation et du CV) ; dépôt ou assistance au dépôt des candidatures ; suivi des candidatures ; assistance à la constitution du dossier de visa et à la préparation de l'entretien consulaire ; accompagnement logistique de base préalable au départ.
**3.2. Prestations exclues** (à la charge du Client) : frais de scolarité et d'inscription des établissements ; frais de dossier, de plateforme (Campus France, Parcoursup, portails d'établissements) et frais consulaires ou de visa ; traduction assermentée, légalisation et authentification des documents ; tests de langue et examens ; transport, hébergement, assurance et subsistance ; tout autre frais versé à un tiers.

### Article 4 — Obligations du Client
Le Client s'engage à : (a) fournir des informations et documents exacts, complets, authentiques et à jour ; (b) transmettre les pièces dans les délais indiqués ; (c) coopérer activement, répondre aux sollicitations et informer sans délai de tout élément nouveau ; (d) s'acquitter des sommes dues selon l'échéancier ; (e) accomplir personnellement les démarches lui incombant (tests, rendez-vous, entretiens, déplacements). La production de documents falsifiés ou d'informations mensongères, ainsi que le défaut de coopération, engagent la seule responsabilité du Client.

### Article 5 — Prix et modalités de paiement
**5.1. Prix.** Le prix total de la prestation est fixé à **{{prix_total}} {{devise_symbole}}** ({{prix_total_lettres}}), toutes taxes comprises. Il rémunère la prestation d'accompagnement, à l'exclusion des frais de l'Article 3.2.
**5.2. Frais d'inscription et d'étude de dossier.** Une somme de **{{frais_inscription}} {{devise_symbole}}** est due à la signature ; elle rémunère le travail initial d'évaluation et d'orientation et **n'est en aucun cas remboursable** (Article 7.2).
**5.3. Échéancier.** Le solde est payable selon : {{echeancier}}.
**5.4. Retard de paiement.** Tout retard pourra entraîner la suspension de la prestation après mise en demeure restée sans effet pendant {{delai_mise_en_demeure_jours}} jours, sans indemnité au profit du Client.

### Article 6 — Mesure de l'avancement
**6.1.** L'avancement est mesuré par étapes objectives, chacune pondérée en pourcentage. Une étape est réputée atteinte lorsque ses diligences ont été substantiellement accomplies par KPB Education.

| Étape | Diligences | Poids | Avancement cumulé |
|---|---|---|---|
| 0 | Inscription et étude initiale du dossier (profil, orientation). Frais non remboursables. | 10 % | 10 % |
| 1 | Constitution et validation du dossier de candidature (pièces, traductions, lettre, CV, choix des établissements). | 40 % | 50 % |
| 2 | Dépôt effectif des candidatures auprès des établissements. | 20 % | 70 % |
| 3 | Suivi et obtention de l'admission, inscription. | 15 % | 85 % |
| 4 | Constitution et dépôt du dossier de visa, préparation de l'entretien. | 15 % | 100 % |

**6.2. Point de non-remboursement.** Le **dépôt effectif des candidatures** (avancement supérieur à 50 %) est un acte déterminant et irréversible, engageant les ressources et relations partenariales de KPB Education. Ce **seuil de 50 %** est le point au-delà duquel aucun remboursement n'est dû (Article 7).

### Article 7 — Politique de remboursement
KPB Education se distingue par une politique de remboursement encadrée, que le Client déclare avoir lue et comprise.
**7.1. Principe.** La prestation étant une obligation de moyens (Article 2), aucun remboursement n'est dû au seul motif d'un refus d'admission, de bourse ou de visa, dès lors que KPB Education a accompli ses diligences.
**7.2. Frais non remboursables.** Les frais d'inscription et d'étude de dossier (Article 5.2) ne sont, en toute hypothèse, pas remboursables.
**7.3. Remboursement dégressif tant que l'avancement n'a pas dépassé 50 %.** En cas de renonciation du Client alors que l'avancement n'a pas dépassé 50 % :
> **Remboursement = Sommes versées − (Prix total × Taux d'avancement atteint)**
Le résultat ne peut être ni négatif, ni inclure les frais non remboursables. Si les sommes versées sont inférieures à la valeur des prestations déjà exécutées, aucun remboursement n'est dû et le solde reste exigible.
**7.4. Aucun remboursement au-delà de 50 %.** Dès que l'avancement dépasse 50 % (notamment à compter du dépôt des candidatures), aucun remboursement n'est dû, quel que soit le motif, sous la seule réserve de l'Article 7.6.
**7.5. Faute ou manquement du Client.** Aucun remboursement n'est dû, quel que soit l'avancement, en cas de : documents falsifiés ou informations mensongères ; défaut de coopération ou absence prolongée de réponse ; non-respect des délais imputable au Client ; non-paiement ; abandon des démarches lui incombant.
**7.6. Défaillance de KPB Education.** En cas d'inexécution fautive de KPB Education, le Client a droit au remboursement des sommes versées correspondant à la part de prestation non exécutée.
**7.7. Force majeure.** KPB Education rembourse les sommes versées correspondant à la part non exécutée, déduction faite des frais déjà engagés et justifiés.
**7.8. Engagement de re-orientation (« seconde chance »).** En cas de refus d'admission et/ou de visa alors que le dossier était complet, déposé dans les délais et que le Client a pleinement coopéré, KPB Education s'engage — **en lieu et place de tout remboursement** — à reprendre **gratuitement** l'accompagnement pour une nouvelle candidature (autre établissement et/ou session suivante), dans la limite de {{nb_tentatives_reorientation}} tentative(s) et d'un délai de {{delai_reorientation_mois}} mois. Les frais dus aux tiers (Article 3.2) restent à la charge du Client.
**7.9. Procédure.** Toute demande de remboursement est adressée par écrit et motivée (courriel à {{kpb_email}}). KPB Education en accuse réception sous {{delai_accuse_jours}} jours ouvrés et notifie sa décision motivée, avec le calcul de l'avancement, sous {{delai_decision_jours}} jours ouvrés. Le remboursement éventuel est versé sous {{delai_versement_jours}} jours ouvrés à compter de l'accord.

### Article 8 — Durée
Le Contrat prend effet à la signature électronique du Client et court jusqu'à l'achèvement de la prestation ou sa résiliation (Article 9), et au plus tard {{duree_mois}} mois après sa prise d'effet, sauf prorogation écrite.

### Article 9 — Résiliation
**9.1.** Le Client peut résilier à tout moment par écrit ; les conséquences financières relèvent de l'Article 7.
**9.2.** KPB Education peut résilier, après mise en demeure restée sans effet pendant {{delai_mise_en_demeure_jours}} jours, en cas de manquement du Client (Articles 4 et 5) ; cette résiliation relève de l'Article 7.5.
**9.3.** La résiliation ne dispense pas le Client du paiement des prestations exécutées jusqu'à sa date d'effet.

### Article 10 — Confidentialité et données personnelles
**10.1.** Chaque Partie préserve la confidentialité des informations échangées.
**10.2.** KPB Education traite les données personnelles du Client aux seules fins d'exécution de la prestation (dossiers de candidature et de visa, communication avec établissements et autorités). Le Client dispose d'un droit d'accès, de rectification et de suppression, exerçable à {{kpb_email}}.

### Article 11 — Propriété des documents
Les documents personnels du Client lui demeurent acquis. Les documents et contenus élaborés par KPB Education (lettres, méthodologies, supports) demeurent sa propriété.

### Article 12 — Responsabilité
La responsabilité de KPB Education n'est engagée qu'en cas de faute prouvée dans l'exécution de son obligation de moyens. Elle n'est pas responsable des décisions des établissements et autorités, des conséquences d'informations inexactes fournies par le Client, ni des retards imputables à des tiers. Sa responsabilité est en tout état de cause limitée au montant total effectivement payé par le Client.

### Article 13 — Force majeure
Aucune Partie n'est responsable d'un manquement résultant d'un cas de force majeure. La Partie affectée en informe l'autre sans délai.

### Article 14 — Droit applicable et litiges
**14.1.** Le Contrat est régi par le droit en vigueur en République du Niger et, le cas échéant, par les Actes uniformes de l'OHADA.
**14.2.** En cas de différend, les Parties recherchent une solution amiable dans un délai de {{delai_amiable_jours}} jours ; à défaut, le litige est porté devant les juridictions compétentes de {{ville_juridiction}}.

### Article 15 — Signature électronique et consentement
**15.1.** Les Parties conviennent de signer par voie électronique. La signature électronique apposée par le Client via la plateforme de KPB Education a la même valeur probante qu'une signature manuscrite et matérialise son consentement libre et éclairé.
**15.2.** En cochant la case « **Lu et approuvé** » et en signant, le Client reconnaît avoir pris connaissance de l'intégralité du Contrat, **y compris la politique de remboursement (Article 7)**, et en accepter tous les termes.
**15.3.** KPB Education conserve une preuve de la signature (identité, date/heure, adresse IP, version du document accepté).

**☐ Je soussigné(e) {{client_nom}} reconnais avoir lu et approuvé le présent Contrat, y compris l'Article 7 (politique de remboursement).**

Fait à {{lieu_signature}}, le {{date_signature}}.
Le Client : {{client_nom}} — Signature électronique.
Pour KPB Education : {{kpb_representant}}, {{kpb_fonction}}.

# ═══════════ ANNEXE 1 — BON DE COMMANDE ═══════════
- **Programme / destination :** {{programme}}
- **Objectif visé :** {{objectif}}
- **Établissement(s) cible(s) :** {{etablissements_cibles}}
- **Prestations incluses :** {{prestations_incluses}}
- **Prix total :** {{prix_total}} {{devise_symbole}}
- **Frais d'inscription non remboursables :** {{frais_inscription}} {{devise_symbole}}
- **Échéancier :** {{echeancier}}
- **Durée :** {{duree_mois}} mois

---

$contractmd$, true)
ON CONFLICT (version) DO UPDATE SET body_md = EXCLUDED.body_md;
