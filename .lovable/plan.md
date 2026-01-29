

# Plan de correction des vulnérabilités de sécurité

## Problème 1 : Données clients exposées (CRITIQUE)

### Situation actuelle
La politique RLS `"All authenticated users can view invoice amounts for leaderboar"` utilise `USING (true)`, ce qui expose toutes les colonnes de la table `invoices` (emails, WhatsApp, noms) à tous les employés.

### Solution : Créer une vue sécurisée pour le leaderboard

**Étape 1 : Créer une vue `invoice_stats` qui n'expose que les champs nécessaires**
```sql
CREATE VIEW public.invoice_stats
WITH (security_invoker = on) AS
SELECT 
  id,
  amount,
  sales_representative,
  status,
  created_at,
  user_id
FROM public.invoices;
```

**Étape 2 : Supprimer la politique RLS problématique**
```sql
DROP POLICY "All authenticated users can view invoice amounts for leaderboar" ON public.invoices;
```

**Étape 3 : Ajouter une politique RLS pour la vue**
```sql
-- Tous les utilisateurs authentifiés peuvent voir les stats
CREATE POLICY "Authenticated users can view invoice stats"
  ON public.invoice_stats FOR SELECT
  TO authenticated
  USING (true);
```

**Étape 4 : Modifier le code du DashboardPage**
- Fichier : `src/pages/DashboardPage.jsx`
- Changer la requête pour utiliser la vue `invoice_stats` au lieu de `invoices`
- Le Leaderboard recevra les mêmes données mais sans les informations personnelles

### Fichiers à modifier
| Fichier | Modification |
|---------|--------------|
| Migration SQL | Créer la vue `invoice_stats`, supprimer l'ancienne politique |
| `src/pages/DashboardPage.jsx` | Utiliser `invoice_stats` pour les statistiques |

---

## Problème 2 : Protection contre les mots de passe compromis

### Solution
Cette fonctionnalité doit être activée manuellement dans les paramètres du backend.

**Action requise :**
- Accéder aux paramètres d'authentification via le backend
- Activer "Leaked Password Protection" dans la section Auth → Password

---

## Problème 3 : Catégories de dépenses visibles par tous

### Analyse
La politique `"Authenticated users can view categories"` permet à tous les utilisateurs de voir les catégories de dépenses. Cependant, cette politique a été ajoutée intentionnellement car :
- Les catégories sont nécessaires pour le formulaire de dépenses (admin seulement)
- Elles ne contiennent pas de données sensibles

### Décision recommandée
**Ignorer cet avertissement** car :
1. Les catégories sont des données de référence non sensibles
2. Même si visibles, seuls les admins peuvent créer/modifier des dépenses
3. Supprimer cette politique casserait le formulaire de dépenses pour les admins

---

## Résumé des actions

| Priorité | Problème | Action |
|----------|----------|--------|
| CRITIQUE | Données clients exposées | Créer une vue sécurisée + modifier le code |
| WARN | Leaked Password Protection | Activer dans les paramètres backend |
| WARN | Catégories visibles | Ignorer (données non sensibles) |

