-- Clients
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
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage clients" ON public.clients;
CREATE POLICY "Staff can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role));

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lien optionnel facture -> client
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON public.invoices (client_id);

-- Engagements
CREATE TABLE IF NOT EXISTS public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  programme text NOT NULL,
  objectif text NOT NULL,
  etablissements_cibles text,
  prestations_incluses text[] NOT NULL DEFAULT '{}',
  devise text NOT NULL DEFAULT 'XOF' CHECK (devise IN ('XOF','EUR','USD')),
  prix_total numeric NOT NULL CHECK (prix_total >= 0),
  frais_inscription numeric NOT NULL DEFAULT 0 CHECK (frais_inscription >= 0),
  echeancier text,
  duree_mois integer NOT NULL DEFAULT 12 CHECK (duree_mois > 0),
  sales_rep text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','awaiting_signature','signed','active')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.engagements TO authenticated;
GRANT ALL ON public.engagements TO service_role;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage engagements" ON public.engagements;
CREATE POLICY "Staff can manage engagements"
  ON public.engagements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role));

DROP TRIGGER IF EXISTS update_engagements_updated_at ON public.engagements;
CREATE TRIGGER update_engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Modèles de contrat
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  body_md text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read templates" ON public.contract_templates;
CREATE POLICY "Authenticated can read templates"
  ON public.contract_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage templates" ON public.contract_templates;
CREATE POLICY "Admins can manage templates"
  ON public.contract_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Signatures
CREATE TABLE IF NOT EXISTS public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  engagement_id uuid REFERENCES public.engagements(id),
  template_version text NOT NULL,
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

GRANT SELECT, INSERT, UPDATE ON public.contract_signatures TO authenticated;
GRANT ALL ON public.contract_signatures TO service_role;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read signatures" ON public.contract_signatures;
CREATE POLICY "Staff can read signatures"
  ON public.contract_signatures FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role));

DROP POLICY IF EXISTS "Staff can insert unsigned signatures" ON public.contract_signatures;
CREATE POLICY "Staff can insert unsigned signatures"
  ON public.contract_signatures FOR INSERT TO authenticated
  WITH CHECK (signed_at IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role)));

DROP POLICY IF EXISTS "Staff can update unsigned signatures" ON public.contract_signatures;
CREATE POLICY "Staff can update unsigned signatures"
  ON public.contract_signatures FOR UPDATE TO authenticated
  USING (signed_at IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role)));

-- Paramètres applicatifs
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read settings" ON public.app_settings;
CREATE POLICY "Authenticated can read settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_settings (key, value)
VALUES ('contract_config', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;