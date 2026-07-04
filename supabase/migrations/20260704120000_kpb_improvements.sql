-- Migration: sales_reps table, invoice sequence, signup trigger, points RPC, follow-up settings

-- 1. Sales reps table (dynamic management)
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales reps"
  ON public.sales_reps FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sales reps"
  ON public.sales_reps FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default sales reps
INSERT INTO public.sales_reps (name, active) VALUES
  ('Josphin', true),
  ('Nadia', true),
  ('Donald', true),
  ('Richard', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Invoice sequence for sequential numbering
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO public.invoice_sequences (year, last_number)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'KPB-' || p_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.get_next_invoice_number(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(integer) TO authenticated;

-- 3. Auto-assign commercial role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'commercial'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RPC to persist monthly points (idempotent)
CREATE OR REPLACE FUNCTION public.persist_monthly_points(
  p_month integer,
  p_year integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_start timestamptz;
  v_end timestamptz;
  rec record;
  v_position integer := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0);
  v_end := (v_start + interval '1 month' - interval '1 second');

  FOR rec IN
    SELECT
      i.sales_representative AS rep_name,
      SUM(i.amount) AS gross_sales,
      SUM(CASE WHEN i.payment_type LIKE '%Maketou%' THEN i.amount * 0.95 ELSE i.amount END) AS net_sales,
      COUNT(*) AS sales_count
    FROM public.invoices i
    WHERE i.status = 'paid'
      AND i.last_status_change >= v_start
      AND i.last_status_change <= v_end
    GROUP BY i.sales_representative
    ORDER BY net_sales DESC
  LOOP
    v_position := v_position + 1;
    INSERT INTO public.sales_rep_points (
      sales_rep, month, year, points, position,
      total_sales, net_sales, total_commission
    ) VALUES (
      rec.rep_name,
      p_month,
      p_year,
      CASE v_position WHEN 1 THEN 10 WHEN 2 THEN 5 WHEN 3 THEN 3 ELSE 0 END,
      v_position,
      rec.gross_sales,
      rec.net_sales,
      rec.net_sales * 0.10
    )
    ON CONFLICT (sales_rep, month, year) DO UPDATE SET
      points = EXCLUDED.points,
      position = EXCLUDED.position,
      total_sales = EXCLUDED.total_sales,
      net_sales = EXCLUDED.net_sales,
      total_commission = EXCLUDED.total_commission,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_monthly_points(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.persist_monthly_points(integer, integer) TO authenticated;

-- 5. Restrict sales_rep_points SELECT to authenticated (remove open policy)
DROP POLICY IF EXISTS "All users can view points" ON public.sales_rep_points;
CREATE POLICY "Authenticated users can view points"
  ON public.sales_rep_points FOR SELECT TO authenticated USING (true);

-- 6. App settings for follow-up configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.app_settings (key, value) VALUES
  ('follow_up_days', '[3, 7, 14]'::jsonb)
ON CONFLICT (key) DO NOTHING;
