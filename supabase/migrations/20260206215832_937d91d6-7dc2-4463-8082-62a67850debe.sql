-- Renforcer l'immutabilité des logs d'audit
-- Empêcher explicitement les mises à jour et suppressions

-- Politique explicite pour empêcher UPDATE
CREATE POLICY "No one can update audit logs"
  ON public.audit_logs
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- Politique explicite pour empêcher DELETE
CREATE POLICY "No one can delete audit logs"
  ON public.audit_logs
  FOR DELETE
  USING (false);

-- Créer un trigger comme défense en profondeur
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$;

-- Trigger pour empêcher les mises à jour
DROP TRIGGER IF EXISTS prevent_audit_log_update ON public.audit_logs;
CREATE TRIGGER prevent_audit_log_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutations();

-- Trigger pour empêcher les suppressions  
DROP TRIGGER IF EXISTS prevent_audit_log_delete ON public.audit_logs;
CREATE TRIGGER prevent_audit_log_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutations();