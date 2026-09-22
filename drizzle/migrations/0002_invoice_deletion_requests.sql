-- 1. Table des demandes de suppression
CREATE TABLE IF NOT EXISTS public.invoice_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  invoice_number text NOT NULL,
  invoice_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  CONSTRAINT invoice_deletion_requests_status_check CHECK (status IN ('pending','approved','rejected','cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS invoice_deletion_requests_pending_uniq
  ON public.invoice_deletion_requests (invoice_id)
  WHERE status = 'pending';

GRANT SELECT ON public.invoice_deletion_requests TO authenticated;
GRANT ALL ON public.invoice_deletion_requests TO service_role;

ALTER TABLE public.invoice_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all deletion requests"
ON public.invoice_deletion_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Requesters read own deletion requests"
ON public.invoice_deletion_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid());

-- 2. Seuls les admins peuvent supprimer une facture directement
DROP POLICY IF EXISTS "Sales reps can delete own invoices" ON public.invoices;

CREATE POLICY "Only admins can delete invoices"
ON public.invoices FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Demander la suppression
CREATE OR REPLACE FUNCTION public.request_invoice_deletion(p_invoice_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inv record;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF COALESCE(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'Un motif est obligatoire';
  END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR v_inv.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoice_deletion_requests
    WHERE invoice_id = p_invoice_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Une demande est déjà en attente pour cette facture';
  END IF;

  INSERT INTO public.invoice_deletion_requests (
    invoice_id, invoice_number, invoice_snapshot, reason, requested_by
  ) VALUES (
    p_invoice_id,
    v_inv.invoice_number,
    jsonb_build_object(
      'client', v_inv.client_first_name || ' ' || v_inv.client_last_name,
      'amount', v_inv.amount,
      'currency', v_inv.currency,
      'status', v_inv.status,
      'service', v_inv.service_description,
      'sales_representative', v_inv.sales_representative,
      'invoice_date', v_inv.invoice_date
    ),
    trim(p_reason),
    auth.uid()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
  VALUES (auth.uid(), 'EDIT', 'invoices', p_invoice_id,
    jsonb_build_object('event', 'deletion_requested', 'reason', trim(p_reason), 'invoice_number', v_inv.invoice_number));

  RETURN jsonb_build_object('ok', true, 'request_id', v_id);
END;
$$;

-- 4. Traiter la demande (admin uniquement)
CREATE OR REPLACE FUNCTION public.review_invoice_deletion(p_request_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req record;
BEGIN
  IF auth.uid() IS NULL OR NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Seul un administrateur peut traiter cette demande';
  END IF;

  SELECT * INTO v_req FROM public.invoice_deletion_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable';
  END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Cette demande a déjà été traitée';
  END IF;

  IF p_approve THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
    VALUES (auth.uid(), 'DELETE', 'invoices', v_req.invoice_id,
      jsonb_build_object('event', 'deletion_approved', 'invoice_number', v_req.invoice_number,
                         'requested_by', v_req.requested_by, 'reason', v_req.reason,
                         'snapshot', v_req.invoice_snapshot));

    DELETE FROM public.invoices WHERE id = v_req.invoice_id;

    UPDATE public.invoice_deletion_requests
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = NULLIF(trim(COALESCE(p_note, '')), '')
    WHERE id = p_request_id;
  ELSE
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
    VALUES (auth.uid(), 'EDIT', 'invoices', v_req.invoice_id,
      jsonb_build_object('event', 'deletion_rejected', 'invoice_number', v_req.invoice_number,
                         'requested_by', v_req.requested_by, 'note', p_note));

    UPDATE public.invoice_deletion_requests
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = NULLIF(trim(COALESCE(p_note, '')), '')
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_invoice_deletion(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_invoice_deletion(uuid, boolean, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_invoice_deletion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_invoice_deletion(uuid, boolean, text) TO authenticated;