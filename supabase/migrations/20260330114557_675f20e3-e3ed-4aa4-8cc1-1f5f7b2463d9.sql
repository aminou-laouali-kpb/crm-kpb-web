
-- Add SELECT policy for accountants on budgets table
CREATE POLICY "Accountants can view budgets"
  ON public.budgets
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'comptable'::app_role));
