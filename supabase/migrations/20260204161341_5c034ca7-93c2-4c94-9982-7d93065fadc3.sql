-- Supprimer l'ancienne fonction et recréer avec le nouveau retour
DROP FUNCTION IF EXISTS public.get_invoice_stats(timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.get_invoice_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  amount numeric, 
  sales_representative text, 
  status text, 
  created_at timestamp with time zone, 
  user_id uuid, 
  service_description text,
  last_status_change timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    i.id,
    i.amount,
    i.sales_representative::text,
    i.status::text,
    i.created_at,
    i.user_id,
    i.service_description,
    i.last_status_change
  FROM public.invoices i
  WHERE 
    -- Factures créées dans la période (pour stats de génération)
    (
      (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date)
    )
    OR
    -- OU factures payées dans la période (pour stats de paiement)
    (
      i.status = 'paid'
      AND (p_start_date IS NULL OR i.last_status_change >= p_start_date)
      AND (p_end_date IS NULL OR i.last_status_change <= p_end_date)
    );
$$;