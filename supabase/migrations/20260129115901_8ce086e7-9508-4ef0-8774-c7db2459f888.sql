-- Étape 2: Mettre à jour les politiques RLS pour expenses et expense_categories

-- Supprimer l'ancienne politique sur expenses
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;

-- Nouvelle politique : admins ET comptables peuvent gérer les dépenses
CREATE POLICY "Admins and accountants can manage expenses"
ON public.expenses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- Supprimer l'ancienne politique de gestion sur expense_categories
DROP POLICY IF EXISTS "Admins can manage expense categories" ON public.expense_categories;

-- Nouvelle politique : admins ET comptables peuvent gérer les catégories de dépenses
CREATE POLICY "Admins and accountants can manage expense categories"
ON public.expense_categories FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));