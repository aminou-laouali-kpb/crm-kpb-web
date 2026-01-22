-- Add SELECT policy for expense_categories to allow authenticated users to view categories
CREATE POLICY "Authenticated users can view categories"
ON public.expense_categories
FOR SELECT
TO authenticated
USING (true);

-- Add validation constraints to expenses table
ALTER TABLE public.expenses
ADD CONSTRAINT valid_expense_amount CHECK (amount > 0 AND amount < 1000000000),
ADD CONSTRAINT valid_expense_description CHECK (length(description) > 0 AND length(description) <= 1000);

-- Add validation constraints to planned_income table
ALTER TABLE public.planned_income
ADD CONSTRAINT valid_income_amount CHECK (amount > 0 AND amount < 1000000000),
ADD CONSTRAINT valid_income_description CHECK (length(description) > 0 AND length(description) <= 1000);

-- Add validation constraints to budgets table
ALTER TABLE public.budgets
ADD CONSTRAINT valid_budget_amount CHECK (budgeted_amount >= 0 AND budgeted_amount < 1000000000);