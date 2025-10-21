-- Fix security warnings by setting search_path for functions
-- Use CASCADE to drop functions with dependencies

DROP FUNCTION IF EXISTS public.update_invoice_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_invoice_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.update_invoice_status_change() CASCADE;
CREATE OR REPLACE FUNCTION public.update_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_change = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

CREATE TRIGGER update_invoices_status_change
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status_change();