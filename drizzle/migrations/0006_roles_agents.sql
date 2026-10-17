-- Nouveaux rôles pour l'espace Dossiers.
-- Fichier séparé : une valeur d'enum ajoutée ne peut pas être utilisée dans la même transaction.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contractuel';
