DROP POLICY IF EXISTS "Authenticated users can view sales reps" ON public.sales_reps;
CREATE POLICY "Staff can view sales reps" ON public.sales_reps FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
DROP POLICY IF EXISTS "Authenticated read procedure types" ON public.procedure_types;
CREATE POLICY "Staff read procedure types" ON public.procedure_types FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
DROP POLICY IF EXISTS "Authenticated read dossier stages" ON public.dossier_stages;
CREATE POLICY "Staff read dossier stages" ON public.dossier_stages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid()));