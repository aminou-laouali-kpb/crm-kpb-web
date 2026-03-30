
-- 1. Add receipt_url column to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS receipt_url text;

-- 2. Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- 4. Authenticated users can read receipts
CREATE POLICY "Authenticated users can read receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-receipts');

-- 5. Update create_audit_log to accept more action types
CREATE OR REPLACE FUNCTION public.create_audit_log(p_action text, p_table_name text, p_record_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_action NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'EDIT', 'LOGIN', 'EXPORT', 'UPLOAD') THEN
    RAISE EXCEPTION 'Invalid action type';
  END IF;
  
  IF p_table_name NOT IN ('invoices', 'user_roles', 'audit_logs', 'payment-receipts') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;
  
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_metadata);
END;
$function$;

-- 6. Add INSERT policy for audit_logs so authenticated users can insert via the function
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
