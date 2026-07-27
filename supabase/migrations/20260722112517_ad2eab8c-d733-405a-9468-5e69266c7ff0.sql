
DROP POLICY IF EXISTS "Receipts: owners and admins can read" ON storage.objects;
CREATE POLICY "Receipts: authorized roles can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id::text = (storage.foldername(objects.name))[1]
        AND i.user_id = auth.uid()
    )
  )
);
