-- Lot 2 : espace Dossiers (suivi des procédures par les agents).
-- Principes :
--   * un dossier est créé automatiquement dès qu'une facture passe « payée » ;
--   * les agents peuvent aussi créer des dossiers manuels (hors CRM) ;
--   * toute écriture passe par des fonctions contrôlées : changement d'étape
--     avec commentaire obligatoire, point du jour, journal non modifiable.

-- ---------------------------------------------------------------------------
-- 1. Référentiel des étapes (communes à toutes les procédures)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dossier_stages (
  code text PRIMARY KEY,
  label text NOT NULL,
  short_label text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('admission', 'visa')),
  sort_order integer NOT NULL
);

ALTER TABLE public.dossier_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read dossier stages" ON public.dossier_stages;
CREATE POLICY "Authenticated read dossier stages"
ON public.dossier_stages FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.dossier_stages TO authenticated;
GRANT ALL ON public.dossier_stages TO service_role;

-- Affectation automatique : agent responsable (et intervenants) par procédure
ALTER TABLE public.procedure_types
  ADD COLUMN IF NOT EXISTS default_assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_collaborator_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];

-- ---------------------------------------------------------------------------
-- 2. Dossiers
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.dossier_ref_seq;

CREATE TABLE IF NOT EXISTS public.dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_id uuid UNIQUE REFERENCES public.invoices(id) ON DELETE SET NULL,
  student_first_name text NOT NULL,
  student_last_name text NOT NULL,
  student_email text,
  student_whatsapp text,
  procedure_type text REFERENCES public.procedure_types(code) ON UPDATE CASCADE,
  destination_country text,
  includes_visa boolean NOT NULL DEFAULT false,
  service_description text,
  sales_rep text,
  origin text NOT NULL DEFAULT 'paiement' CHECK (origin IN ('paiement', 'manuel')),
  payment_status text NOT NULL DEFAULT 'paye' CHECK (payment_status IN ('paye', 'partiel', 'non_facture')),
  stage text NOT NULL DEFAULT 'non_demarre' REFERENCES public.dossier_stages(code),
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  admission_result text CHECK (admission_result IN ('admis', 'refuse', 'liste_attente')),
  visa_result text CHECK (visa_result IN ('obtenu', 'refuse')),
  status text NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'en_pause', 'cloture', 'abandonne')),
  closure_outcome text CHECK (closure_outcome IN ('succes', 'echec')),
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  next_action text,
  next_action_due date,
  target_date date,
  last_update_at timestamptz,
  last_update_work_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS dossiers_assigned_status_idx ON public.dossiers (assigned_to, status);
CREATE INDEX IF NOT EXISTS dossiers_stage_idx ON public.dossiers (stage) WHERE status = 'actif';
CREATE INDEX IF NOT EXISTS dossiers_student_email_idx ON public.dossiers (lower(student_email));

CREATE TABLE IF NOT EXISTS public.dossier_collaborators (
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (dossier_id, user_id)
);
CREATE INDEX IF NOT EXISTS dossier_collaborators_user_idx ON public.dossier_collaborators (user_id);

-- Journal du dossier (append-only)
CREATE TABLE IF NOT EXISTS public.dossier_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN (
    'creation', 'stage_change', 'daily_update', 'client_contact', 'note',
    'commercial_note', 'blocage', 'deblocage', 'status_change', 'assignment',
    'info_update', 'payment', 'contract'
  )),
  body text,
  from_stage text,
  to_stage text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  work_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS dossier_events_dossier_idx ON public.dossier_events (dossier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dossier_events_author_date_idx ON public.dossier_events (author_id, work_date);
-- Un seul point du jour par dossier, par agent et par jour
CREATE UNIQUE INDEX IF NOT EXISTS dossier_events_daily_unique
  ON public.dossier_events (dossier_id, author_id, work_date) WHERE type = 'daily_update';

-- ---------------------------------------------------------------------------
-- 3. Fonctions utilitaires
-- ---------------------------------------------------------------------------
-- Journée de travail à Niamey
CREATE OR REPLACE FUNCTION public.dossier_work_date()
RETURNS date
LANGUAGE sql
STABLE
AS $$ SELECT (now() AT TIME ZONE 'Africa/Niamey')::date $$;

CREATE OR REPLACE FUNCTION public.dossier_visible(_uid uuid, _dossier_id uuid, _procedure_type text, _assigned_to uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN
    public.has_role(_uid, 'admin'::app_role)
    OR public.has_role(_uid, 'commercial'::app_role)
    OR public.has_role(_uid, 'comptable'::app_role)
    OR public.has_role(_uid, 'agent'::app_role)
    OR (
      public.has_role(_uid, 'contractuel'::app_role)
      AND (
        _assigned_to = _uid
        OR EXISTS (SELECT 1 FROM public.dossier_collaborators c WHERE c.dossier_id = _dossier_id AND c.user_id = _uid)
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = _uid
            AND (p.procedure_scope IS NULL OR _procedure_type = ANY (p.procedure_scope))
        )
      )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.dossier_can_edit(_uid uuid, _dossier_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN
    public.has_role(_uid, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dossiers d
      WHERE d.id = _dossier_id
        AND (
          d.assigned_to = _uid
          OR EXISTS (SELECT 1 FROM public.dossier_collaborators c WHERE c.dossier_id = d.id AND c.user_id = _uid)
        )
        AND (public.has_role(_uid, 'agent'::app_role) OR public.has_role(_uid, 'contractuel'::app_role))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.dossier_is_processor(_uid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.has_role(_uid, 'admin'::app_role)
      OR public.has_role(_uid, 'agent'::app_role)
      OR public.has_role(_uid, 'contractuel'::app_role);
END;
$$;

-- Écrit une entrée du journal et met à jour la date de dernière activité de l'équipe
CREATE OR REPLACE FUNCTION public._dossier_log(
  p_dossier_id uuid,
  p_type text,
  p_body text,
  p_from_stage text DEFAULT NULL,
  p_to_stage text DEFAULT NULL,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.dossier_events (dossier_id, author_id, type, body, from_stage, to_stage, meta, work_date)
  VALUES (p_dossier_id, auth.uid(), p_type, NULLIF(trim(p_body), ''), p_from_stage, p_to_stage,
          COALESCE(p_meta, '{}'::jsonb), public.dossier_work_date())
  RETURNING id INTO v_id;

  -- Le suivi quotidien compte les actions de l'équipe de traitement, pas les notes commerciales
  IF p_type IN ('stage_change', 'daily_update', 'client_contact', 'note', 'blocage', 'deblocage', 'status_change')
     AND auth.uid() IS NOT NULL
     AND public.dossier_is_processor(auth.uid()) THEN
    UPDATE public.dossiers
    SET last_update_at = now(),
        last_update_work_date = public.dossier_work_date(),
        updated_at = now()
    WHERE id = p_dossier_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public._dossier_log(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._dossier_require_comment(p_comment text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF length(trim(COALESCE(p_comment, ''))) < 10 THEN
    RAISE EXCEPTION 'Commentaire obligatoire (10 caractères minimum)';
  END IF;
END;
$$;

-- Référence lisible DOS-AAAA-NNNN
CREATE OR REPLACE FUNCTION public.assign_dossier_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := 'DOS-' || to_char(now() AT TIME ZONE 'Africa/Niamey', 'YYYY') || '-'
      || lpad(nextval('public.dossier_ref_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_dossier_reference ON public.dossiers;
CREATE TRIGGER trg_assign_dossier_reference
  BEFORE INSERT ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.assign_dossier_reference();

-- Journal non modifiable : seul l'admin corrige ; l'auteur peut reprendre son
-- point du jour tant que la journée n'est pas terminée.
CREATE OR REPLACE FUNCTION public.guard_dossier_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.type = 'daily_update'
     AND OLD.author_id = auth.uid()
     AND OLD.work_date = public.dossier_work_date()
     AND NEW.type = OLD.type
     AND NEW.dossier_id = OLD.dossier_id
     AND NEW.author_id IS NOT DISTINCT FROM OLD.author_id
     AND NEW.work_date = OLD.work_date THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Le journal du dossier ne peut pas être modifié';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dossier_events ON public.dossier_events;
CREATE TRIGGER trg_guard_dossier_events
  BEFORE UPDATE OR DELETE ON public.dossier_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_dossier_events();

-- ---------------------------------------------------------------------------
-- 4. Règles d'accès : lecture selon le rôle, écriture uniquement via les RPC
-- ---------------------------------------------------------------------------
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dossiers visibles selon le rôle" ON public.dossiers;
CREATE POLICY "Dossiers visibles selon le rôle"
ON public.dossiers FOR SELECT TO authenticated
USING (public.dossier_visible(auth.uid(), id, procedure_type, assigned_to));

DROP POLICY IF EXISTS "Journal visible avec le dossier" ON public.dossier_events;
CREATE POLICY "Journal visible avec le dossier"
ON public.dossier_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dossiers d
  WHERE d.id = dossier_id
    AND public.dossier_visible(auth.uid(), d.id, d.procedure_type, d.assigned_to)
));

DROP POLICY IF EXISTS "Intervenants visibles avec le dossier" ON public.dossier_collaborators;
CREATE POLICY "Intervenants visibles avec le dossier"
ON public.dossier_collaborators FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.dossiers d
  WHERE d.id = dossier_id
    AND public.dossier_visible(auth.uid(), d.id, d.procedure_type, d.assigned_to)
));

REVOKE INSERT, UPDATE, DELETE ON public.dossiers, public.dossier_events, public.dossier_collaborators FROM authenticated, anon;
GRANT SELECT ON public.dossiers, public.dossier_events, public.dossier_collaborators TO authenticated;
GRANT ALL ON public.dossiers, public.dossier_events, public.dossier_collaborators TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.dossier_ref_seq TO service_role;

-- L'équipe de traitement doit pouvoir lister les agents (noms) pour l'affectation
-- (profiles est déjà lisible par tout compte ayant un rôle — lot 1).

-- ---------------------------------------------------------------------------
-- 5. Création des dossiers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._dossier_set_collaborators(p_dossier_id uuid, p_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.dossier_collaborators
  WHERE dossier_id = p_dossier_id
    AND NOT (user_id = ANY (COALESCE(p_user_ids, ARRAY[]::uuid[])));

  INSERT INTO public.dossier_collaborators (dossier_id, user_id)
  SELECT p_dossier_id, u
  FROM unnest(COALESCE(p_user_ids, ARRAY[]::uuid[])) AS u
  WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public._dossier_set_collaborators(uuid, uuid[]) FROM PUBLIC, anon, authenticated;

-- Crée (ou rattache) le dossier d'une facture payée. Idempotent.
CREATE OR REPLACE FUNCTION public._ensure_dossier_for_invoice(p_invoice_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_route record;
  v_dossier_id uuid;
  v_partial boolean;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND OR v_inv.status IS DISTINCT FROM 'paid' OR v_inv.product_code = 'guide_ultime' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_dossier_id FROM public.dossiers WHERE invoice_id = p_invoice_id;
  IF FOUND THEN
    RETURN v_dossier_id;
  END IF;

  v_partial := EXISTS (
    SELECT 1 FROM public.payment_installments pi
    WHERE pi.invoice_id = p_invoice_id AND pi.status = 'pending'
  );

  -- Dossier manuel déjà ouvert pour cet étudiant : on le rattache au paiement
  SELECT d.id INTO v_dossier_id
  FROM public.dossiers d
  WHERE d.invoice_id IS NULL
    AND d.status IN ('actif', 'en_pause')
    AND d.student_email IS NOT NULL
    AND lower(d.student_email) = lower(v_inv.client_email)
    AND (d.procedure_type IS NULL OR v_inv.procedure_type IS NULL OR d.procedure_type = v_inv.procedure_type)
  ORDER BY d.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.dossiers
    SET invoice_id = p_invoice_id,
        client_id = COALESCE(client_id, v_inv.client_id),
        procedure_type = COALESCE(procedure_type, v_inv.procedure_type),
        payment_status = CASE WHEN v_partial THEN 'partiel' ELSE 'paye' END,
        sales_rep = COALESCE(v_inv.sales_representative::text, sales_rep),
        service_description = COALESCE(service_description, v_inv.service_description),
        updated_at = now()
    WHERE id = v_dossier_id;

    PERFORM public._dossier_log(
      v_dossier_id, 'payment',
      format('Paiement validé (facture %s, %s %s) — dossier rattaché.', v_inv.invoice_number, v_inv.amount, v_inv.currency),
      NULL, NULL, jsonb_build_object('invoice_id', p_invoice_id)
    );
    RETURN v_dossier_id;
  END IF;

  SELECT * INTO v_route FROM public.procedure_types WHERE code = v_inv.procedure_type;

  INSERT INTO public.dossiers (
    client_id, invoice_id, student_first_name, student_last_name, student_email, student_whatsapp,
    procedure_type, destination_country, includes_visa, service_description, sales_rep,
    origin, payment_status, assigned_to, created_by
  ) VALUES (
    v_inv.client_id, p_invoice_id,
    COALESCE(NULLIF(trim(v_inv.client_first_name), ''), 'Étudiant'),
    COALESCE(NULLIF(trim(v_inv.client_last_name), ''), ''),
    lower(v_inv.client_email), v_inv.client_whatsapp,
    v_inv.procedure_type, v_inv.destination_country, COALESCE(v_inv.includes_visa, false),
    v_inv.service_description, v_inv.sales_representative::text,
    'paiement', CASE WHEN v_partial THEN 'partiel' ELSE 'paye' END,
    v_route.default_assignee_id, COALESCE(auth.uid(), v_inv.user_id)
  )
  RETURNING id INTO v_dossier_id;

  IF v_route.default_collaborator_ids IS NOT NULL THEN
    PERFORM public._dossier_set_collaborators(v_dossier_id, v_route.default_collaborator_ids);
  END IF;

  PERFORM public._dossier_log(
    v_dossier_id, 'creation',
    format('Dossier ouvert automatiquement : paiement validé par %s (facture %s, %s %s).',
           COALESCE(v_inv.sales_representative::text, 'le commercial'), v_inv.invoice_number, v_inv.amount, v_inv.currency),
    NULL, 'non_demarre', jsonb_build_object('invoice_id', p_invoice_id, 'assigned_to', v_route.default_assignee_id)
  );

  RETURN v_dossier_id;
END;
$$;

REVOKE ALL ON FUNCTION public._ensure_dossier_for_invoice(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_invoice_paid_create_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public._ensure_dossier_for_invoice(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_create_dossier ON public.invoices;
CREATE TRIGGER trg_invoice_paid_create_dossier
  AFTER INSERT OR UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.on_invoice_paid_create_dossier();

-- Tranches : le dossier affiche « solde dû » et le journal informe l'agent
CREATE OR REPLACE FUNCTION public.on_installment_change_update_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dossier_id uuid;
BEGIN
  IF NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT id INTO v_dossier_id FROM public.dossiers WHERE invoice_id = NEW.invoice_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    UPDATE public.dossiers SET payment_status = 'partiel', updated_at = now() WHERE id = v_dossier_id;
    PERFORM public._dossier_log(
      v_dossier_id, 'payment',
      format('Paiement partiel : reste %s %s, prochaine échéance le %s.',
             NEW.remaining_amount, NEW.currency, to_char(NEW.due_date, 'DD/MM/YYYY')),
      NULL, NULL, jsonb_build_object('installment_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('paid', 'abandoned') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.payment_installments pi
      WHERE pi.invoice_id = NEW.invoice_id AND pi.status = 'pending' AND pi.id <> NEW.id
    ) AND NEW.status = 'paid' THEN
      UPDATE public.dossiers SET payment_status = 'paye', updated_at = now() WHERE id = v_dossier_id;
    END IF;
    PERFORM public._dossier_log(
      v_dossier_id, 'payment',
      CASE WHEN NEW.status = 'paid' THEN 'Solde payé.' ELSE 'Solde abandonné : ' || COALESCE(NEW.closed_reason, '') END,
      NULL, NULL, jsonb_build_object('installment_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_installment_update_dossier ON public.payment_installments;
CREATE TRIGGER trg_installment_update_dossier
  AFTER INSERT OR UPDATE OF status ON public.payment_installments
  FOR EACH ROW EXECUTE FUNCTION public.on_installment_change_update_dossier();

-- Dossier manuel (contact direct, admission avant paiement…)
CREATE OR REPLACE FUNCTION public.create_manual_dossier(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_whatsapp text,
  p_procedure_type text,
  p_destination_country text,
  p_includes_visa boolean,
  p_assigned_to uuid,
  p_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_route record;
  v_assignee uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL OR NOT (
    public.dossier_is_processor(v_uid) OR public.has_role(v_uid, 'commercial'::app_role)
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF COALESCE(trim(p_first_name), '') = '' OR COALESCE(trim(p_last_name), '') = '' THEN
    RAISE EXCEPTION 'Prénom et nom de l''étudiant sont obligatoires';
  END IF;
  IF p_procedure_type IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.procedure_types WHERE code = p_procedure_type) THEN
    RAISE EXCEPTION 'Type de procédure inconnu';
  END IF;
  -- Un contractuel ne crée que des dossiers de son périmètre
  IF public.has_role(v_uid, 'contractuel'::app_role)
     AND NOT public.has_role(v_uid, 'admin'::app_role)
     AND NOT public.has_role(v_uid, 'agent'::app_role)
     AND EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.user_id = v_uid
         AND p.procedure_scope IS NOT NULL
         AND (p_procedure_type IS NULL OR NOT (p_procedure_type = ANY (p.procedure_scope)))
     ) THEN
    RAISE EXCEPTION 'Procédure hors de votre périmètre';
  END IF;

  SELECT * INTO v_route FROM public.procedure_types WHERE code = p_procedure_type;
  -- Un non-admin ne peut affecter qu'à lui-même ; sinon routage par procédure
  v_assignee := CASE
    WHEN public.has_role(v_uid, 'admin'::app_role) THEN COALESCE(p_assigned_to, v_route.default_assignee_id)
    WHEN public.has_role(v_uid, 'agent'::app_role) OR public.has_role(v_uid, 'contractuel'::app_role) THEN v_uid
    ELSE v_route.default_assignee_id
  END;

  INSERT INTO public.dossiers (
    student_first_name, student_last_name, student_email, student_whatsapp,
    procedure_type, destination_country, includes_visa,
    origin, payment_status, assigned_to, created_by
  ) VALUES (
    trim(p_first_name), trim(p_last_name),
    NULLIF(lower(trim(COALESCE(p_email, ''))), ''), NULLIF(trim(COALESCE(p_whatsapp, '')), ''),
    p_procedure_type, NULLIF(trim(COALESCE(p_destination_country, '')), ''), COALESCE(p_includes_visa, false),
    'manuel', 'non_facture', v_assignee, v_uid
  )
  RETURNING id INTO v_id;

  IF v_route.default_collaborator_ids IS NOT NULL THEN
    PERFORM public._dossier_set_collaborators(v_id, v_route.default_collaborator_ids);
  END IF;

  PERFORM public._dossier_log(
    v_id, 'creation',
    COALESCE(NULLIF(trim(p_note), ''), 'Dossier créé manuellement (hors CRM).'),
    NULL, 'non_demarre', jsonb_build_object('origin', 'manuel', 'assigned_to', v_assignee)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_dossier(text, text, text, text, text, text, boolean, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_manual_dossier(text, text, text, text, text, text, boolean, uuid, text) TO authenticated;

-- Reprise de l'existant : dossiers pour les factures payées depuis une date (admin)
CREATE OR REPLACE FUNCTION public.import_paid_invoices_as_dossiers(p_since date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_count integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF p_since IS NULL THEN
    RAISE EXCEPTION 'Date de départ obligatoire';
  END IF;

  FOR v_inv IN
    SELECT i.id FROM public.invoices i
    WHERE i.status = 'paid'
      AND i.last_status_change >= p_since
      AND COALESCE(i.product_code, '') <> 'guide_ultime'
      AND NOT EXISTS (SELECT 1 FROM public.dossiers d WHERE d.invoice_id = i.id)
    ORDER BY i.last_status_change
  LOOP
    IF public._ensure_dossier_for_invoice(v_inv.id) IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.import_paid_invoices_as_dossiers(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_paid_invoices_as_dossiers(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Actions sur un dossier
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dossier_change_stage(
  p_dossier_id uuid,
  p_stage text,
  p_comment text,
  p_result text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_d record;
  v_current_result text;
BEGIN
  IF NOT public.dossier_can_edit(auth.uid(), p_dossier_id) THEN
    RAISE EXCEPTION 'Seuls l''agent du dossier, ses intervenants ou un admin peuvent changer l''étape';
  END IF;
  PERFORM public._dossier_require_comment(p_comment);

  SELECT * INTO v_d FROM public.dossiers WHERE id = p_dossier_id FOR UPDATE;
  IF v_d.status <> 'actif' THEN
    RAISE EXCEPTION 'Dossier non actif : réactivez-le avant de changer d''étape';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.dossier_stages WHERE code = p_stage) THEN
    RAISE EXCEPTION 'Étape inconnue';
  END IF;
  IF p_stage = 'reponse_recue' AND COALESCE(p_result, '') NOT IN ('admis', 'refuse', 'liste_attente') THEN
    RAISE EXCEPTION 'Indiquez la réponse : admis, refusé ou liste d''attente';
  END IF;
  IF p_stage = 'visa_resultat' AND COALESCE(p_result, '') NOT IN ('obtenu', 'refuse') THEN
    RAISE EXCEPTION 'Indiquez le résultat du visa : obtenu ou refusé';
  END IF;
  v_current_result := (CASE p_stage
    WHEN 'reponse_recue' THEN v_d.admission_result
    WHEN 'visa_resultat' THEN v_d.visa_result
  END);
  IF p_stage = v_d.stage AND p_result IS NOT DISTINCT FROM v_current_result THEN
    RAISE EXCEPTION 'Le dossier est déjà à cette étape';
  END IF;

  UPDATE public.dossiers
  SET stage = p_stage,
      stage_changed_at = now(),
      admission_result = CASE WHEN p_stage = 'reponse_recue' THEN p_result ELSE admission_result END,
      visa_result = CASE WHEN p_stage = 'visa_resultat' THEN p_result ELSE visa_result END,
      includes_visa = includes_visa OR p_stage IN ('visa_demarre', 'visa_demande', 'visa_resultat'),
      updated_at = now()
  WHERE id = p_dossier_id;

  PERFORM public._dossier_log(p_dossier_id, 'stage_change', p_comment, v_d.stage, p_stage,
                              jsonb_build_object('result', p_result));
END;
$$;

REVOKE ALL ON FUNCTION public.dossier_change_stage(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_change_stage(uuid, text, text, text) TO authenticated;

-- Point du jour, échange client, note (équipe) ou note commerciale (commerciaux)
CREATE OR REPLACE FUNCTION public.dossier_add_entry(
  p_dossier_id uuid,
  p_type text,
  p_body text,
  p_next_action text DEFAULT NULL,
  p_next_action_due date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_d record;
  v_type text := p_type;
  v_id uuid;
BEGIN
  SELECT * INTO v_d FROM public.dossiers WHERE id = p_dossier_id;
  IF NOT FOUND OR NOT public.dossier_visible(v_uid, v_d.id, v_d.procedure_type, v_d.assigned_to) THEN
    RAISE EXCEPTION 'Dossier introuvable';
  END IF;
  PERFORM public._dossier_require_comment(p_body);

  IF v_type NOT IN ('daily_update', 'client_contact', 'note', 'commercial_note') THEN
    RAISE EXCEPTION 'Type d''entrée invalide';
  END IF;

  -- Hors équipe de traitement du dossier : uniquement des notes (commerciales pour les commerciaux)
  IF NOT public.dossier_can_edit(v_uid, p_dossier_id) THEN
    IF public.has_role(v_uid, 'commercial'::app_role) THEN
      v_type := 'commercial_note';
    ELSE
      v_type := 'note';
    END IF;
  ELSIF v_type = 'commercial_note' THEN
    v_type := 'note';
  END IF;

  IF v_type = 'daily_update' THEN
    -- Un seul point du jour : on reprend celui d'aujourd'hui s'il existe
    UPDATE public.dossier_events
    SET body = trim(p_body),
        meta = meta || jsonb_build_object('next_action', p_next_action, 'next_action_due', p_next_action_due,
                                          'revised_at', now()),
        edited_at = now(),
        edited_by = v_uid
    WHERE dossier_id = p_dossier_id
      AND author_id = v_uid
      AND type = 'daily_update'
      AND work_date = public.dossier_work_date()
    RETURNING id INTO v_id;
  END IF;

  IF v_id IS NULL THEN
    v_id := public._dossier_log(p_dossier_id, v_type, p_body, NULL, NULL,
              jsonb_build_object('next_action', p_next_action, 'next_action_due', p_next_action_due));
  ELSE
    UPDATE public.dossiers
    SET last_update_at = now(), last_update_work_date = public.dossier_work_date(), updated_at = now()
    WHERE id = p_dossier_id;
  END IF;

  IF v_type <> 'commercial_note' AND (p_next_action IS NOT NULL OR p_next_action_due IS NOT NULL) THEN
    UPDATE public.dossiers
    SET next_action = NULLIF(trim(COALESCE(p_next_action, '')), ''),
        next_action_due = p_next_action_due,
        updated_at = now()
    WHERE id = p_dossier_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dossier_add_entry(uuid, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_add_entry(uuid, text, text, text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.dossier_set_blocked(p_dossier_id uuid, p_blocked boolean, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.dossier_can_edit(auth.uid(), p_dossier_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  PERFORM public._dossier_require_comment(p_reason);

  UPDATE public.dossiers
  SET is_blocked = p_blocked,
      blocked_reason = CASE WHEN p_blocked THEN trim(p_reason) ELSE NULL END,
      updated_at = now()
  WHERE id = p_dossier_id;

  PERFORM public._dossier_log(p_dossier_id, CASE WHEN p_blocked THEN 'blocage' ELSE 'deblocage' END, p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.dossier_set_blocked(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_set_blocked(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dossier_set_status(
  p_dossier_id uuid,
  p_status text,
  p_outcome text,
  p_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text;
BEGIN
  IF NOT public.dossier_can_edit(auth.uid(), p_dossier_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  PERFORM public._dossier_require_comment(p_comment);
  IF p_status NOT IN ('actif', 'en_pause', 'cloture', 'abandonne') THEN
    RAISE EXCEPTION 'Statut invalide';
  END IF;
  IF p_status = 'cloture' AND COALESCE(p_outcome, '') NOT IN ('succes', 'echec') THEN
    RAISE EXCEPTION 'Indiquez l''issue du dossier : succès ou échec';
  END IF;

  SELECT status INTO v_old FROM public.dossiers WHERE id = p_dossier_id FOR UPDATE;
  IF v_old = p_status THEN
    RAISE EXCEPTION 'Le dossier a déjà ce statut';
  END IF;

  UPDATE public.dossiers
  SET status = p_status,
      closure_outcome = CASE WHEN p_status = 'cloture' THEN p_outcome ELSE NULL END,
      closed_at = CASE WHEN p_status IN ('cloture', 'abandonne') THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_dossier_id;

  PERFORM public._dossier_log(p_dossier_id, 'status_change', p_comment, NULL, NULL,
                              jsonb_build_object('from', v_old, 'to', p_status, 'outcome', p_outcome));
END;
$$;

REVOKE ALL ON FUNCTION public.dossier_set_status(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_set_status(uuid, text, text, text) TO authenticated;

-- Affectation : l'admin affecte librement ; un agent peut prendre un dossier non affecté
CREATE OR REPLACE FUNCTION public.dossier_assign(
  p_dossier_id uuid,
  p_assigned_to uuid,
  p_collaborators uuid[],
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_d record;
  v_is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
BEGIN
  SELECT * INTO v_d FROM public.dossiers WHERE id = p_dossier_id FOR UPDATE;
  IF NOT FOUND OR NOT public.dossier_visible(v_uid, v_d.id, v_d.procedure_type, v_d.assigned_to) THEN
    RAISE EXCEPTION 'Dossier introuvable';
  END IF;

  IF NOT v_is_admin THEN
    IF NOT (
      (v_d.assigned_to IS NULL AND p_assigned_to = v_uid AND public.dossier_is_processor(v_uid))
      OR (v_d.assigned_to = v_uid)
    ) THEN
      RAISE EXCEPTION 'Seul un admin peut réaffecter ce dossier';
    END IF;
  END IF;

  IF p_assigned_to IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_assigned_to AND ur.role::text IN ('admin', 'agent', 'contractuel')
  ) THEN
    RAISE EXCEPTION 'La personne choisie n''est pas dans l''équipe de traitement';
  END IF;

  UPDATE public.dossiers SET assigned_to = p_assigned_to, updated_at = now() WHERE id = p_dossier_id;
  IF p_collaborators IS NOT NULL THEN
    PERFORM public._dossier_set_collaborators(p_dossier_id, array_remove(p_collaborators, p_assigned_to));
  END IF;

  PERFORM public._dossier_log(
    p_dossier_id, 'assignment',
    COALESCE(NULLIF(trim(COALESCE(p_comment, '')), ''), 'Affectation mise à jour.'),
    NULL, NULL,
    jsonb_build_object('from', v_d.assigned_to, 'to', p_assigned_to, 'collaborators', to_jsonb(p_collaborators))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dossier_assign(uuid, uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_assign(uuid, uuid, uuid[], text) TO authenticated;

-- Informations du dossier (étudiant, destination, échéance cible…)
CREATE OR REPLACE FUNCTION public.dossier_update_info(p_dossier_id uuid, p_fields jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed text[];
BEGIN
  IF NOT public.dossier_can_edit(auth.uid(), p_dossier_id) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF p_fields ? 'procedure_type' AND NULLIF(p_fields->>'procedure_type', '') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.procedure_types WHERE code = p_fields->>'procedure_type') THEN
    RAISE EXCEPTION 'Type de procédure inconnu';
  END IF;

  SELECT array_agg(k) INTO v_changed
  FROM jsonb_object_keys(p_fields) AS k
  WHERE k IN ('student_first_name', 'student_last_name', 'student_email', 'student_whatsapp',
              'procedure_type', 'destination_country', 'includes_visa', 'target_date');

  IF v_changed IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.dossiers SET
    student_first_name = CASE WHEN p_fields ? 'student_first_name' AND trim(p_fields->>'student_first_name') <> ''
                              THEN trim(p_fields->>'student_first_name') ELSE student_first_name END,
    student_last_name = CASE WHEN p_fields ? 'student_last_name' AND trim(p_fields->>'student_last_name') <> ''
                             THEN trim(p_fields->>'student_last_name') ELSE student_last_name END,
    student_email = CASE WHEN p_fields ? 'student_email'
                         THEN NULLIF(lower(trim(p_fields->>'student_email')), '') ELSE student_email END,
    student_whatsapp = CASE WHEN p_fields ? 'student_whatsapp'
                            THEN NULLIF(trim(p_fields->>'student_whatsapp'), '') ELSE student_whatsapp END,
    procedure_type = CASE WHEN p_fields ? 'procedure_type'
                          THEN NULLIF(p_fields->>'procedure_type', '') ELSE procedure_type END,
    destination_country = CASE WHEN p_fields ? 'destination_country'
                               THEN NULLIF(trim(p_fields->>'destination_country'), '') ELSE destination_country END,
    includes_visa = CASE WHEN p_fields ? 'includes_visa'
                         THEN COALESCE((p_fields->>'includes_visa')::boolean, includes_visa) ELSE includes_visa END,
    target_date = CASE WHEN p_fields ? 'target_date'
                       THEN NULLIF(p_fields->>'target_date', '')::date ELSE target_date END,
    updated_at = now()
  WHERE id = p_dossier_id;

  PERFORM public._dossier_log(p_dossier_id, 'info_update',
    'Informations modifiées : ' || array_to_string(v_changed, ', '), NULL, NULL, p_fields);
END;
$$;

REVOKE ALL ON FUNCTION public.dossier_update_info(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dossier_update_info(uuid, jsonb) TO authenticated;

-- Équipe de traitement (pour les listes d'affectation)
CREATE OR REPLACE FUNCTION public.list_dossier_team()
RETURNS TABLE (user_id uuid, full_name text, email text, roles text[], procedure_scope text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  RETURN QUERY
  SELECT p.user_id, COALESCE(p.full_name, p.email), p.email,
         array_agg(DISTINCT ur.role::text), p.procedure_scope
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.is_active
    AND ur.role::text IN ('admin', 'agent', 'contractuel')
  GROUP BY p.user_id, p.full_name, p.email, p.procedure_scope
  ORDER BY 2;
END;
$$;

REVOKE ALL ON FUNCTION public.list_dossier_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dossier_team() TO authenticated;
