-- Align payment-receipts INSERT/UPDATE/DELETE with the broadened SELECT policy
-- so commerciaux can upload/replace receipts when marking invoices paid.

DROP POLICY IF EXISTS "Receipts: owners and admins can upload" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: owners and admins can update" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: owners and admins can delete" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: authorized roles can upload" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: authorized roles can update" ON storage.objects;
DROP POLICY IF EXISTS "Receipts: authorized roles can delete" ON storage.objects;

-- Also normalize the SELECT policy path segment check to use `name`
DROP POLICY IF EXISTS "Receipts: authorized roles can read" ON storage.objects;
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
      WHERE i.id::text = (storage.foldername(name))[1]
        AND i.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Receipts: authorized roles can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id::text = (storage.foldername(name))[1]
        AND i.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Receipts: authorized roles can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
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
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id::text = (storage.foldername(name))[1]
        AND i.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Receipts: authorized roles can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'comptable'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id::text = (storage.foldername(name))[1]
        AND i.user_id = auth.uid()
    )
  )
);
