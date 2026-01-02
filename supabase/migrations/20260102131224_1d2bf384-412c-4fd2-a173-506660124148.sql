-- 1. Drop the permissive INSERT policy that allows any authenticated user to insert
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- 2. Create a SECURITY DEFINER function for controlled audit logging
-- This function validates inputs and only allows specific action types
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate action type to prevent arbitrary values
  IF p_action NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Invalid action type';
  END IF;
  
  -- Validate table_name to only allow known tables
  IF p_table_name NOT IN ('invoices', 'user_roles', 'audit_logs') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;
  
  -- Insert audit log entry with the authenticated user's ID
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_metadata);
END;
$$;

-- 3. Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.create_audit_log TO authenticated;

-- 4. Revoke from public/anon to ensure only authenticated users can call it
REVOKE EXECUTE ON FUNCTION public.create_audit_log FROM public;
REVOKE EXECUTE ON FUNCTION public.create_audit_log FROM anon;