-- Supprimer la politique problématique qui vient d'être créée
DROP POLICY IF EXISTS "Authenticated users can view invoice stats via view" ON public.invoices;

-- Supprimer la vue
DROP VIEW IF EXISTS public.invoice_stats;

-- Créer une fonction SECURITY DEFINER qui retourne les stats sans exposer les données sensibles
-- Cette fonction s'exécute avec les privilèges du propriétaire (postgres), donc elle peut lire invoices
-- mais ne retourne que les colonnes non-sensibles
CREATE OR REPLACE FUNCTION public.get_invoice_stats(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  amount numeric,
  sales_representative text,
  status text,
  created_at timestamptz,
  user_id uuid,
  service_description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.amount,
    i.sales_representative::text,
    i.status::text,
    i.created_at,
    i.user_id,
    i.service_description
  FROM public.invoices i
  WHERE 
    (p_start_date IS NULL OR i.created_at >= p_start_date)
    AND (p_end_date IS NULL OR i.created_at <= p_end_date);
$$;

-- Donner accès à la fonction pour les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_invoice_stats(timestamptz, timestamptz) TO authenticated;