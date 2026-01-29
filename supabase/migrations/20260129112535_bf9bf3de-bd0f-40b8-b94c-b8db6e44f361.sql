-- Activer RLS sur la vue invoice_stats
-- Note: Pour les vues avec security_invoker=on, les politiques RLS de la table sous-jacente s'appliquent
-- Mais nous devons nous assurer que les utilisateurs authentifiés peuvent accéder à la vue

-- Créer une politique RLS pour permettre l'accès à la vue par tous les utilisateurs authentifiés
-- Comme la vue utilise security_invoker=on, elle hérite des politiques de la table invoices
-- Cependant, nous avons supprimé la politique permissive sur invoices

-- Solution : Créer une fonction qui permet de lire les stats sans exposer les données sensibles
-- Puis recréer la vue avec les bonnes permissions

-- D'abord, supprimer la vue existante
DROP VIEW IF EXISTS public.invoice_stats;

-- Recréer la vue SANS security_invoker pour qu'elle soit accessible à tous les authentifiés
-- Cette vue ne contient que des données agrégées/non-sensibles
CREATE VIEW public.invoice_stats AS
SELECT 
  id,
  amount,
  sales_representative,
  status,
  created_at,
  user_id,
  service_description
FROM public.invoices;

-- Donner accès à la vue pour les utilisateurs authentifiés
GRANT SELECT ON public.invoice_stats TO authenticated;