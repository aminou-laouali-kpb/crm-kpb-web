-- Guide ultime du boursier africain: tag sales so commission and CRM filters
-- do not depend on the free-text service description.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS product_code text;

COMMENT ON COLUMN public.invoices.product_code IS
  'Optional product code. guide_ultime = Guide ultime du boursier africain (fixed commission).';

UPDATE public.invoices
SET product_code = 'guide_ultime'
WHERE product_code IS NULL
  AND service_description ILIKE '%guide ultime%';

CREATE INDEX IF NOT EXISTS invoices_product_code_idx
  ON public.invoices (product_code)
  WHERE product_code IS NOT NULL;

-- Return type changes, so the function must be dropped first.
DROP FUNCTION IF EXISTS public.get_invoice_stats(timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.get_invoice_stats(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
  id uuid,
  amount numeric,
  sales_representative text,
  status text,
  created_at timestamp with time zone,
  user_id uuid,
  service_description text,
  last_status_change timestamp with time zone,
  payment_type text,
  receipt_url text,
  product_code text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    i.receipt_url,
    i.product_code
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

REVOKE ALL ON FUNCTION public.get_invoice_stats(timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_invoice_stats(timestamp with time zone, timestamp with time zone) TO authenticated;
