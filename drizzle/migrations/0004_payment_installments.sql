CREATE TABLE public.payment_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL,
  sales_rep text NOT NULL,
  client_name text NOT NULL,
  client_whatsapp text,
  service text NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  total_amount numeric,
  remaining_amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  last_reminder_at timestamptz,
  reminder_count integer NOT NULL DEFAULT 0,
  closed_reason text,
  closed_invoice_id uuid,
  closed_at timestamptz,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_installments_status_chk CHECK (status IN ('pending','paid','abandoned'))
);
GRANT SELECT, INSERT, UPDATE ON public.payment_installments TO authenticated;
GRANT ALL ON public.payment_installments TO service_role;
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inst_select" ON public.payment_installments FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'comptable'));
CREATE POLICY "inst_insert" ON public.payment_installments FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "inst_update" ON public.payment_installments FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR has_role(auth.uid(),'admin'))
WITH CHECK (owner_user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE TRIGGER update_payment_installments_updated_at BEFORE UPDATE ON public.payment_installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_inst_owner_status ON public.payment_installments(owner_user_id, status, due_date);

CREATE TABLE public.installment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL REFERENCES public.payment_installments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  channel text NOT NULL DEFAULT 'whatsapp',
  comment text,
  next_due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.installment_reminders TO authenticated;
GRANT ALL ON public.installment_reminders TO service_role;
ALTER TABLE public.installment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rem_select" ON public.installment_reminders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.payment_installments p WHERE p.id = installment_id
  AND (p.owner_user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'comptable'))));
CREATE POLICY "rem_insert" ON public.installment_reminders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.payment_installments p WHERE p.id = installment_id
  AND (p.owner_user_id = auth.uid() OR has_role(auth.uid(),'admin'))));