-- 1. Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Créer la table des points pour le suivi mensuel et trimestriel
CREATE TABLE public.sales_rep_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep text NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  points integer NOT NULL DEFAULT 0,
  position integer NOT NULL CHECK (position >= 1 AND position <= 4),
  total_sales numeric NOT NULL DEFAULT 0,
  net_sales numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sales_rep, month, year)
);

-- 3. RLS pour la table
ALTER TABLE public.sales_rep_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage points"
  ON public.sales_rep_points
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "All users can view points"
  ON public.sales_rep_points
  FOR SELECT
  USING (true);

-- 4. Trigger pour updated_at
CREATE TRIGGER update_sales_rep_points_updated_at
  BEFORE UPDATE ON public.sales_rep_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Mettre à jour la fonction RPC pour inclure payment_type
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
  last_status_change timestamp with time zone,
  payment_type text
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
    i.last_status_change,
    i.payment_type
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
$$;