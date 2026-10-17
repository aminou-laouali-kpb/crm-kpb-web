-- Lot 1 : fondations (profils, rôles, types de procédure) et durcissement sécurité.

-- ---------------------------------------------------------------------------
-- 1. Profils : relie chaque compte à une personne, un commercial et un périmètre
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  sales_rep_id uuid REFERENCES public.sales_reps(id) ON DELETE SET NULL,
  procedure_scope text[], -- NULL = toutes les procédures
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_sales_rep_id_key
  ON public.profiles (sales_rep_id) WHERE sales_rep_id IS NOT NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read profiles" ON public.profiles;
CREATE POLICY "Users read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Reprise : un profil par compte existant, rattaché au commercial de même email
INSERT INTO public.profiles (user_id, email, full_name, sales_rep_id)
SELECT DISTINCT ON (u.id)
  u.id,
  u.email,
  COALESCE(sr.name, NULLIF(u.raw_user_meta_data->>'full_name', '')),
  sr.id
FROM auth.users u
LEFT JOIN public.sales_reps sr
  ON sr.email IS NOT NULL AND lower(trim(sr.email)) = lower(u.email)
ORDER BY u.id, sr.created_at
ON CONFLICT (user_id) DO NOTHING;

-- Un compte désactivé perd tous ses droits, partout où has_role est utilisé
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = _user_id AND p.is_active = false
  );
$$;

-- Nouvelle inscription : profil créé, mais AUCUN rôle (activation par un admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Accès de l'utilisateur connecté en un seul appel (rôles + profil)
CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_uid,
    'roles', COALESCE(
      (SELECT jsonb_agg(DISTINCT ur.role::text) FROM public.user_roles ur WHERE ur.user_id = v_uid),
      '[]'::jsonb
    ),
    'profile', (
      SELECT jsonb_build_object(
        'full_name', p.full_name,
        'email', p.email,
        'sales_rep_id', p.sales_rep_id,
        'sales_rep_name', sr.name,
        'procedure_scope', p.procedure_scope,
        'is_active', p.is_active
      )
      FROM public.profiles p
      LEFT JOIN public.sales_reps sr ON sr.id = p.sales_rep_id
      WHERE p.user_id = v_uid
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access() TO authenticated;

-- Gestion des comptes (admin)
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  roles text[],
  sales_rep_id uuid,
  sales_rep_name text,
  procedure_scope text[],
  is_active boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    COALESCE(
      (SELECT array_agg(DISTINCT ur.role::text) FROM public.user_roles ur WHERE ur.user_id = u.id),
      ARRAY[]::text[]
    ),
    p.sales_rep_id,
    sr.name,
    p.procedure_scope,
    COALESCE(p.is_active, true),
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  LEFT JOIN public.sales_reps sr ON sr.id = p.sales_rep_id
  ORDER BY COALESCE(p.full_name, u.email::text);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_access(
  p_user_id uuid,
  p_roles text[],
  p_full_name text,
  p_sales_rep_id uuid,
  p_procedure_scope text[],
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_roles text[] := COALESCE(p_roles, ARRAY[]::text[]);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    IF v_role NOT IN ('admin', 'commercial', 'comptable', 'agent', 'contractuel') THEN
      RAISE EXCEPTION 'Rôle invalide : %', v_role;
    END IF;
  END LOOP;

  IF p_user_id = auth.uid() AND (NOT ('admin' = ANY (v_roles)) OR p_is_active IS FALSE) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas retirer votre propre accès administrateur';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, sales_rep_id, procedure_scope, is_active)
  SELECT p_user_id, u.email, NULLIF(trim(p_full_name), ''), p_sales_rep_id,
         NULLIF(p_procedure_scope, ARRAY[]::text[]), COALESCE(p_is_active, true)
  FROM auth.users u WHERE u.id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    sales_rep_id = EXCLUDED.sales_rep_id,
    procedure_scope = EXCLUDED.procedure_scope,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = p_user_id AND NOT (role::text = ANY (v_roles));

  FOREACH v_role IN ARRAY v_roles LOOP
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, v_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(), 'UPDATE', 'user_roles', p_user_id,
    jsonb_build_object(
      'roles', to_jsonb(v_roles),
      'sales_rep_id', p_sales_rep_id,
      'procedure_scope', to_jsonb(p_procedure_scope),
      'is_active', p_is_active
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_access(uuid, text[], text, uuid, text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user_access(uuid, text[], text, uuid, text[], boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Types de procédure (routage des futurs dossiers) + champs sur la facture
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.procedure_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.procedure_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read procedure types" ON public.procedure_types;
CREATE POLICY "Authenticated read procedure types"
ON public.procedure_types FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage procedure types" ON public.procedure_types;
CREATE POLICY "Admins manage procedure types"
ON public.procedure_types FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_types TO authenticated;

INSERT INTO public.procedure_types (code, label, sort_order) VALUES
  ('france_privee', 'France — écoles privées', 10),
  ('campus_france', 'France — Campus France (universités publiques)', 20),
  ('belgique', 'Belgique', 30),
  ('canada', 'Canada', 40),
  ('usa', 'États-Unis', 50),
  ('allemagne', 'Allemagne', 60),
  ('uk_langue', 'Royaume-Uni — cours d''anglais', 70),
  ('bourse_eiffel', 'Bourse Eiffel', 80),
  ('bourse', 'Bourse d''études (autres)', 90),
  ('visa', 'Visa uniquement', 100),
  ('autre', 'Autre', 999)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS procedure_type text REFERENCES public.procedure_types(code) ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS includes_visa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoices.procedure_type IS 'Type de procédure vendue — sert au routage automatique des dossiers.';

-- ---------------------------------------------------------------------------
-- 3. Factures : création réservée au personnel commercial, verrouillage après paiement
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sales reps can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can insert own invoices" ON public.invoices;
CREATE POLICY "Staff can insert own invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'commercial'::app_role)
  )
);

-- Un commercial rattaché à un compte facture toujours en son propre nom
CREATE OR REPLACE FUNCTION public.enforce_invoice_sales_rep()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT sr.name INTO v_name
  FROM public.profiles p
  JOIN public.sales_reps sr ON sr.id = p.sales_rep_id
  WHERE p.user_id = auth.uid();

  IF v_name IS NOT NULL THEN
    NEW.sales_representative := v_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_invoice_sales_rep ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_sales_rep
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invoice_sales_rep();

CREATE OR REPLACE FUNCTION public.guard_invoice_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin et service (auth.uid() NULL) : pas de restriction
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.invoice_number := OLD.invoice_number;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  NEW.sales_representative := OLD.sales_representative;

  -- La date de paiement (last_status_change) ne bouge qu'avec le statut
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    NEW.last_status_change := OLD.last_status_change;
  END IF;

  IF OLD.status = 'paid' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Facture payée : seul un administrateur peut changer son statut';
    END IF;
    IF NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.product_code IS DISTINCT FROM OLD.product_code THEN
      RAISE EXCEPTION 'Facture payée : montant et devise ne sont modifiables que par un administrateur';
    END IF;
  ELSIF NEW.status = 'paid' AND COALESCE(NEW.receipt_url, '') = '' THEN
    RAISE EXCEPTION 'Un reçu de paiement est obligatoire pour marquer la facture payée';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_invoice_update ON public.invoices;
CREATE TRIGGER trg_guard_invoice_update
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_update();

-- Journal : tous les changements sensibles et toutes les suppressions
CREATE OR REPLACE FUNCTION public.log_invoice_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(), 'DELETE', 'invoices', OLD.id,
      jsonb_build_object(
        'invoice_number', OLD.invoice_number,
        'invoice_owner', OLD.user_id,
        'client_email', OLD.client_email,
        'amount', OLD.amount,
        'status', OLD.status
      )
    );
    RETURN OLD;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.sales_representative IS DISTINCT FROM OLD.sales_representative
     OR (public.has_role(auth.uid(), 'admin'::app_role) AND NEW.user_id IS DISTINCT FROM auth.uid()) THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'STATUS_CHANGE' ELSE 'UPDATE' END,
      'invoices', NEW.id,
      jsonb_build_object(
        'invoice_number', NEW.invoice_number,
        'invoice_owner', NEW.user_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_amount', OLD.amount,
        'new_amount', NEW.amount,
        'old_sales_rep', OLD.sales_representative,
        'new_sales_rep', NEW.sales_representative
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_invoice_access() FROM PUBLIC, anon, authenticated;

-- Statistiques : chacun voit les montants (classement), mais pas les reçus ni
-- l'identifiant du créateur des factures des autres
DROP FUNCTION IF EXISTS public.get_invoice_stats(timestamp with time zone, timestamp with time zone);
CREATE FUNCTION public.get_invoice_stats(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(id uuid, amount numeric, sales_representative text, status text, created_at timestamp with time zone, user_id uuid, service_description text, last_status_change timestamp with time zone, payment_type text, receipt_url text, product_code text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_full boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT (
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'commercial'::app_role)
    OR public.has_role(v_uid, 'comptable'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  v_full := public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'comptable'::app_role);

  RETURN QUERY
  SELECT i.id, i.amount, i.sales_representative::text, i.status::text, i.created_at,
         CASE WHEN v_full OR i.user_id = v_uid THEN i.user_id END,
         i.service_description, i.last_status_change, i.payment_type,
         CASE WHEN v_full OR i.user_id = v_uid THEN i.receipt_url END,
         i.product_code
  FROM public.invoices i
  WHERE ((p_start_date IS NULL OR i.created_at >= p_start_date) AND (p_end_date IS NULL OR i.created_at <= p_end_date))
     OR (i.status = 'paid' AND (p_start_date IS NULL OR i.last_status_change >= p_start_date) AND (p_end_date IS NULL OR i.last_status_change <= p_end_date));
END;
$function$;
REVOKE ALL ON FUNCTION public.get_invoice_stats(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_stats(timestamp with time zone, timestamp with time zone) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Contrat depuis une facture : seul le propriétaire de la facture (ou un admin)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public._create_contract_request_from_invoice_impl(uuid, text)') IS NULL
     AND to_regprocedure('public.create_contract_request_from_invoice(uuid, text)') IS NOT NULL THEN
    ALTER FUNCTION public.create_contract_request_from_invoice(uuid, text)
      RENAME TO _create_contract_request_from_invoice_impl;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public._create_contract_request_from_invoice_impl(uuid, text) FROM PUBLIC, anon, authenticated;

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
  v_owner uuid;
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

  RETURN public._create_contract_request_from_invoice_impl(p_invoice_id, p_entity_key);
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_request_from_invoice(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contract_request_from_invoice(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Journal d'audit : écriture uniquement via les fonctions contrôlées
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- ---------------------------------------------------------------------------
-- 6. Reçus de paiement : lecture et dépôt inchangés, remplacement/suppression admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Receipts: authorized roles can update" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: authorized roles can delete" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: admins can update" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: admins can delete" ON storage.objects;

CREATE POLICY "Receipts: admins can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Receipts: admins can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-receipts' AND public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 7. Divers
-- ---------------------------------------------------------------------------
-- Classement : plus de limite à 4 commerciaux
DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.sales_rep_points'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%position%'
  LOOP
    EXECUTE format('ALTER TABLE public.sales_rep_points DROP CONSTRAINT %I', v_con);
  END LOOP;
END $$;
ALTER TABLE public.sales_rep_points
  ADD CONSTRAINT sales_rep_points_position_check CHECK (position >= 1);

-- Seuils de relance partagés par tous (auparavant dans le navigateur de l'admin)
INSERT INTO public.app_settings (key, value)
VALUES ('follow_up_days', '[7, 14]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Index utilisés par les règles d'accès et les recherches
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS invoices_client_email_idx ON public.invoices (lower(client_email));
CREATE INDEX IF NOT EXISTS invoices_status_last_change_idx ON public.invoices (status, last_status_change);
CREATE INDEX IF NOT EXISTS invoices_procedure_type_idx ON public.invoices (procedure_type) WHERE procedure_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS payment_installments_invoice_id_idx ON public.payment_installments (invoice_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx ON public.audit_logs (table_name, record_id);
