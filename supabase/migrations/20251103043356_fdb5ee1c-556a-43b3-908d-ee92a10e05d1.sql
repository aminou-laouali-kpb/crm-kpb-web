-- Create audit_logs table for tracking admin access to sensitive data
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (via trigger)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create function to log admin access to invoices
CREATE OR REPLACE FUNCTION public.log_invoice_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when an admin accesses someone else's invoice
  IF has_role(auth.uid(), 'admin'::app_role) AND NEW.user_id != auth.uid() THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'invoice_owner', NEW.user_id,
        'client_email', NEW.client_email,
        'amount', NEW.amount
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for SELECT operations on invoices (via SELECT in RLS)
-- Note: We'll track via application layer for SELECT, but UPDATE/DELETE via triggers
CREATE TRIGGER audit_invoice_update
AFTER UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.log_invoice_access();

CREATE TRIGGER audit_invoice_delete
AFTER DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.log_invoice_access();

-- Add index for performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_accessed_at ON public.audit_logs(accessed_at DESC);