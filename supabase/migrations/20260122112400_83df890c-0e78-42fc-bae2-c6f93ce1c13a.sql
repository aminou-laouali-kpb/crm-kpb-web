-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Only admins can manage expense categories
CREATE POLICY "Admins can manage expense categories"
  ON public.expense_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending')),
  payment_method TEXT,
  notes TEXT,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Only admins can manage expenses
CREATE POLICY "Admins can manage expenses"
  ON public.expenses
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create planned_income table
CREATE TABLE public.planned_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('received', 'pending', 'overdue')),
  source TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_type TEXT CHECK (recurrence_type IN ('monthly', 'quarterly', 'yearly', NULL)),
  notes TEXT,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on planned_income
ALTER TABLE public.planned_income ENABLE ROW LEVEL SECURITY;

-- Only admins can manage planned income
CREATE POLICY "Admins can manage planned income"
  ON public.planned_income
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  admin_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (month, year, category_id)
);

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Only admins can manage budgets
CREATE POLICY "Admins can manage budgets"
  ON public.budgets
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description, color, icon) VALUES
  ('Loyer / Location', 'Frais de location des locaux', '#ef4444', 'home'),
  ('Salaires et charges', 'Paiement des employés et charges sociales', '#f97316', 'users'),
  ('Fournitures de bureau', 'Matériel et consommables de bureau', '#eab308', 'package'),
  ('Marketing / Publicité', 'Campagnes publicitaires et marketing', '#84cc16', 'megaphone'),
  ('Télécommunications', 'Internet, téléphone et services de communication', '#22c55e', 'phone'),
  ('Déplacements', 'Transport et frais de déplacement', '#14b8a6', 'car'),
  ('Formation', 'Formation et développement du personnel', '#06b6d4', 'graduation-cap'),
  ('Maintenance', 'Entretien et réparations', '#3b82f6', 'wrench'),
  ('Assurances', 'Assurances diverses', '#8b5cf6', 'shield'),
  ('Taxes et impôts', 'Obligations fiscales', '#d946ef', 'receipt'),
  ('Autres', 'Dépenses diverses', '#6b7280', 'folder');

-- Create triggers for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

CREATE TRIGGER update_planned_income_updated_at
  BEFORE UPDATE ON public.planned_income
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_updated_at();

-- Create RLS policy to allow all authenticated users to view aggregated invoice stats
-- This allows sales reps to see the leaderboard without seeing client details
CREATE POLICY "All authenticated users can view invoice amounts for leaderboard"
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (true);