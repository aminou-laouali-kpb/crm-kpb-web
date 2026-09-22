-- contract_templates: only staff working on contracts
DROP POLICY IF EXISTS "Authenticated can read templates" ON public.contract_templates;
CREATE POLICY "Staff can read contract templates"
ON public.contract_templates FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'commercial'::app_role));

-- expense_categories: accounting staff only
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.expense_categories;
CREATE POLICY "Accounting staff can view categories"
ON public.expense_categories FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

-- invoice_sequences: admins only (numbering is issued by SECURITY DEFINER functions)
DROP POLICY IF EXISTS "Authenticated can read invoice_sequences" ON public.invoice_sequences;
CREATE POLICY "Admins can read invoice_sequences"
ON public.invoice_sequences FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- app_settings: staff roles only
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.app_settings;
CREATE POLICY "Staff can read settings"
ON public.app_settings FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'commercial'::app_role)
  OR has_role(auth.uid(), 'comptable'::app_role)
);