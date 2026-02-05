-- Add explicit SELECT policy for expenses table
-- The current ALL policy may cause ambiguity, so add a clear SELECT policy

CREATE POLICY "Admins and accountants can view expenses"
  ON public.expenses
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));