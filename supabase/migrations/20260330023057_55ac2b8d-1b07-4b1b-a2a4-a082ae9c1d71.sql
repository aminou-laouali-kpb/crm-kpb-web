
DROP FUNCTION IF EXISTS public.get_invoice_stats(timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.get_invoice_stats(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(id uuid, amount numeric, sales_representative text, status text, created_at timestamp with time zone, user_id uuid, service_description text, last_status_change timestamp with time zone, payment_type text, receipt_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.amount,
    i.sales_representative::text,
    i.status::text,
    i.created_at,
    i.user_id,
    i.service_description,
    i.last_status_change,
    i.payment_type,
    i.receipt_url
  FROM public.invoices i
  WHERE 
    (
      (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date)
    )
    OR
    (
      i.status = 'paid'
      AND (p_start_date IS NULL OR i.last_status_change >= p_start_date)
      AND (p_end_date IS NULL OR i.last_status_change <= p_end_date)
    );
END;
$function$;
