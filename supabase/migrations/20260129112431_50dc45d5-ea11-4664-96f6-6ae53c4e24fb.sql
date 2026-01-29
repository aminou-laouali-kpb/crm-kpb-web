-- Étape 1 : Créer une vue sécurisée qui n'expose que les champs nécessaires pour le leaderboard
-- Cette vue masque les données personnelles des clients (email, WhatsApp, noms)
CREATE VIEW public.invoice_stats
WITH (security_invoker = on) AS
SELECT 
  id,
  amount,
  sales_representative,
  status,
  created_at,
  user_id,
  service_description
FROM public.invoices;

-- Étape 2 : Supprimer la politique RLS problématique qui exposait toutes les données
DROP POLICY "All authenticated users can view invoice amounts for leaderboar" ON public.invoices;