CREATE TABLE public.expense_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  day_of_month integer NOT NULL DEFAULT 1,
  active_from date NOT NULL DEFAULT date_trunc('month', now())::date,
  active_to date,
  months_pattern integer[],
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_templates TO authenticated;
GRANT ALL ON public.expense_templates TO service_role;

ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and accountants can view expense templates"
ON public.expense_templates FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'comptable'::app_role));

CREATE POLICY "Admins can manage expense templates"
ON public.expense_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_expense_templates_updated_at
BEFORE UPDATE ON public.expense_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();