-- Étape 1 : Ajouter le role 'commercial' au type enum
-- Cette valeur doit être ajoutée dans une migration séparée avant d'être utilisée
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial';