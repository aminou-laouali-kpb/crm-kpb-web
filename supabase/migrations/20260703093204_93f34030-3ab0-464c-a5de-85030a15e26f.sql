
-- 1) sales_rep_points: restrict SELECT to authenticated
DROP POLICY IF EXISTS "All users can view points" ON public.sales_rep_points;
CREATE POLICY "Authenticated users can view points"
  ON public.sales_rep_points
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) storage.objects: rewrite payment-receipts policies with ownership checks
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read receipts" ON storage.objects;

-- Helper predicate: user must be admin OR owner of the invoice whose id is the first path segment
CREATE POLICY "Receipts: owners and admins can read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id::text = (storage.foldername(name))[1]
          AND i.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Receipts: owners and admins can upload"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id::text = (storage.foldername(name))[1]
          AND i.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Receipts: owners and admins can update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id::text = (storage.foldername(name))[1]
          AND i.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id::text = (storage.foldername(name))[1]
          AND i.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Receipts: owners and admins can delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id::text = (storage.foldername(name))[1]
          AND i.user_id = auth.uid()
      )
    )
  );

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from PUBLIC/anon.
-- Trigger-only functions: fully revoke (triggers run as table owner).
REVOKE ALL ON FUNCTION public.prevent_audit_log_mutations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_invoice_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_invoice_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_invoice_access() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_invoice_user_id() FROM PUBLIC, anon, authenticated;

-- App-callable functions: only authenticated, never anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.create_audit_log(text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_audit_log(text, text, uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.get_invoice_stats(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_stats(timestamp with time zone, timestamp with time zone) TO authenticated;
