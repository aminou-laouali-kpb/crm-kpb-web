-- Données de départ des lots 1 à 3, à exécuter une fois, juste après les
-- migrations 0006 à 0009 (structure). Idempotent : peut être relancé sans effet.

-- Commerciaux : un par valeur existante du type sales_rep (Donald désactivé :
-- clients transférés à Nadia)
INSERT INTO public.sales_reps (name, active)
SELECT v.name, v.name <> 'Donald'
FROM unnest(enum_range(NULL::public.sales_rep)::text[]) AS v(name)
ON CONFLICT (name) DO NOTHING;

-- Types de procédure (routage automatique des dossiers)
INSERT INTO public.procedure_types (code, label, sort_order) VALUES
  ('france_privee', 'France — écoles privées', 10),
  ('campus_france', 'France — Campus France (universités publiques)', 20),
  ('belgique', 'Belgique', 30),
  ('canada', 'Canada', 40),
  ('usa', 'États-Unis', 50),
  ('allemagne', 'Allemagne', 60),
  ('uk_langue', 'Royaume-Uni — cours d''anglais', 70),
  ('bourse_eiffel', 'Bourse Eiffel', 80),
  ('bourse', 'Bourse d''études (autres)', 90),
  ('visa', 'Visa uniquement', 100),
  ('autre', 'Autre', 999)
ON CONFLICT (code) DO NOTHING;

-- Étapes communes à toutes les procédures
INSERT INTO public.dossier_stages (code, label, short_label, phase, sort_order) VALUES
  ('non_demarre', 'Candidature non démarrée', 'Non démarrée', 'admission', 0),
  ('infos_demandees', 'Informations demandées', 'Infos demandées', 'admission', 1),
  ('infos_recues', 'Informations de candidature reçues', 'Infos reçues', 'admission', 2),
  ('remplissage_en_cours', 'Remplissage du formulaire en cours', 'Remplissage', 'admission', 3),
  ('remplissage_termine', 'Remplissage du formulaire terminé', 'Rempli', 'admission', 4),
  ('dossier_finalise', 'Dossier finalisé / soumis — en attente de réponse', 'Soumis', 'admission', 5),
  ('reponse_recue', 'Réponse reçue (admission / bourse)', 'Réponse', 'admission', 6),
  ('visa_demarre', 'Procédure visa démarrée — attente des documents', 'Visa démarré', 'visa', 7),
  ('visa_demande', 'Visa demandé', 'Visa demandé', 'visa', 8),
  ('visa_resultat', 'Visa reçu / refusé', 'Visa : résultat', 'visa', 9)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  short_label = EXCLUDED.short_label,
  phase = EXCLUDED.phase,
  sort_order = EXCLUDED.sort_order;

-- Un profil par compte existant, rattaché au commercial de même email
INSERT INTO public.profiles (user_id, email, full_name, sales_rep_id)
SELECT DISTINCT ON (u.id)
  u.id,
  u.email,
  COALESCE(sr.name, NULLIF(u.raw_user_meta_data->>'full_name', '')),
  sr.id
FROM auth.users u
LEFT JOIN public.sales_reps sr
  ON sr.email IS NOT NULL AND lower(trim(sr.email)) = lower(u.email)
ORDER BY u.id, sr.created_at
ON CONFLICT (user_id) DO NOTHING;

-- Réglages partagés
INSERT INTO public.app_settings (key, value) VALUES
  ('follow_up_days', '[7, 14]'::jsonb),
  ('contract_config', '{}'::jsonb),
  -- Suivi des contrats : factures enregistrées à partir de cette date
  ('contract_tracking_since', to_jsonb(to_char(current_date - 30, 'YYYY-MM-DD')))
ON CONFLICT (key) DO NOTHING;
