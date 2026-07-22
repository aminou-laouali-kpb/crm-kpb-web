
DROP POLICY IF EXISTS "Sales reps can view invoices" ON public.invoices;

CREATE POLICY "Users view own invoices or admins view all"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);
