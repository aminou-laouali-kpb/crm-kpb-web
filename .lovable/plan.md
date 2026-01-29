# Plan : Ajout du rôle Comptable ✅ IMPLÉMENTÉ

## Objectif
Créer un nouveau rôle "comptable" permettant à un utilisateur de gérer les dépenses sans avoir les privilèges complets d'administrateur.

## Modifications à effectuer

### 1. Base de données - Ajout du rôle

**Migration SQL :**
```sql
-- Ajouter le rôle 'comptable' à l'enum app_role
ALTER TYPE public.app_role ADD VALUE 'comptable';
```

### 2. Base de données - Mise à jour des politiques RLS

Modifier les politiques RLS pour permettre aux comptables de gérer les dépenses :

| Table | Action | Accès actuel | Nouvel accès |
|-------|--------|--------------|--------------|
| `expenses` | ALL | admin | admin OU comptable |
| `expense_categories` | ALL | admin | admin OU comptable |
| `planned_income` | ALL | admin | admin uniquement |
| `budgets` | ALL | admin | admin uniquement |

**Politiques à modifier :**
```sql
-- Supprimer l'ancienne politique sur expenses
DROP POLICY "Admins can manage expenses" ON public.expenses;

-- Nouvelle politique : admins ET comptables peuvent gérer les dépenses
CREATE POLICY "Admins and accountants can manage expenses"
ON public.expenses FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));

-- Idem pour expense_categories
DROP POLICY "Admins can manage expense categories" ON public.expense_categories;
CREATE POLICY "Admins and accountants can manage expense categories"
ON public.expense_categories FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comptable'));
```

### 3. Code - Créer un hook pour vérifier l'accès comptabilité

**Nouveau fichier : `src/hooks/useAccountingAccess.jsx`**

Ce hook vérifiera si l'utilisateur a le rôle `admin` OU `comptable` :

```javascript
export const useAccountingAccess = () => {
  // Vérifie si l'utilisateur a accès à la comptabilité
  // Retourne: { hasAccess, isAdmin, isAccountant, loading }
};
```

### 4. Code - Modifier la page Comptabilité

**Fichier : `src/pages/AccountingPage.jsx`**

- Remplacer `useAdminCheck` par `useAccountingAccess`
- Afficher/masquer certaines sections selon le rôle :
  - **Comptable** : Accès aux dépenses et vue d'ensemble
  - **Admin** : Accès complet (dépenses, revenus planifiés, budgets)

### 5. Code - Modifier le bouton CRM

**Fichier : `src/pages/CRMPage.jsx`**

- Le bouton "Comptabilité" sera visible pour les admins ET les comptables

## Permissions par rôle

| Fonctionnalité | Admin | Comptable | Sales Rep |
|----------------|-------|-----------|-----------|
| Vue d'ensemble comptabilité | Oui | Oui (lecture) | Non |
| Gérer les dépenses | Oui | Oui | Non |
| Gérer les catégories | Oui | Oui | Non |
| Gérer les revenus planifiés | Oui | Non | Non |
| Gérer les budgets | Oui | Non | Non |
| Export PDF/Excel | Oui | Oui | Non |
| Accès CRM | Oui | Oui | Oui |

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter le rôle + modifier les politiques RLS |
| `src/hooks/useAccountingAccess.jsx` | Créer (hook de vérification d'accès) |
| `src/pages/AccountingPage.jsx` | Modifier (utiliser le nouveau hook, masquer certains onglets) |
| `src/pages/CRMPage.jsx` | Modifier (afficher bouton pour comptables aussi) |
| `src/integrations/supabase/types.ts` | Sera mis à jour automatiquement |

## Attribution du rôle

Pour attribuer le rôle "comptable" à un utilisateur, il faudra exécuter cette requête dans la base de données :

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('UUID_DE_LUTILISATEUR', 'comptable');
```

Cela peut être fait via le backend (Cloud View > Run SQL) après avoir créé le compte utilisateur.

