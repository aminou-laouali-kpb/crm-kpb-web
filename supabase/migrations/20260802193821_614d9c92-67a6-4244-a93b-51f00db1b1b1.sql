-- 1) Restrict sales performance data to admins and accountants
DROP POLICY IF EXISTS "Authenticated users can view points" ON public.sales_rep_points;
CREATE POLICY "Admins and accountants can view points"
  ON public.sales_rep_points
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comptable'::app_role)
  );

-- 2) Prevent staff from marking a contract as signed via direct table access
DROP POLICY IF EXISTS "Staff can update unsigned signatures" ON public.contract_signatures;
CREATE POLICY "Staff can update unsigned signatures"
  ON public.contract_signatures
  FOR UPDATE
  TO authenticated
  USING (
    signed_at IS NULL
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'commercial'::app_role)
    )
  )
  WITH CHECK (
    signed_at IS NULL
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'commercial'::app_role)
    )
  );

-- No direct DELETE policy: signed contract records stay immutable for clients/staff
REVOKE DELETE ON public.contract_signatures FROM authenticated;