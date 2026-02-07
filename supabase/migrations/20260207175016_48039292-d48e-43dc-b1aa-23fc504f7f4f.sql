-- Étape 2 : Mettre à jour la politique SELECT sur invoices et attribuer les rôles

-- Mettre a jour la politique SELECT sur invoices pour permettre aux commerciaux de voir toutes les factures
DROP POLICY IF EXISTS "Sales reps can view own invoices" ON public.invoices;

CREATE POLICY "Sales reps can view invoices"
  ON public.invoices
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

-- Attribuer le role commercial aux vendeurs existants
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('31c828e1-759b-4ec9-9d1e-97d0e098a3fd', 'commercial'),
  ('8c874f09-f0bd-49be-9ed2-268a120038f7', 'commercial'),
  ('b9730604-3efc-4c6c-a994-e73b1ac02a65', 'commercial'),
  ('4e925b61-0cd9-4fbc-93a4-9c61fdf11aa5', 'commercial')
ON CONFLICT (user_id, role) DO NOTHING;