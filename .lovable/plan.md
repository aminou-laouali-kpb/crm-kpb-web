
# Plan : Utiliser la date de paiement au lieu de la date de creation

## Probleme identifie

Actuellement, le Dashboard et la page Reports filtrent les factures sur `created_at` (date de creation) au lieu de `last_status_change` (date du dernier changement de statut = date de paiement pour les factures payees).

**Impact :** Si une facture est creee en decembre mais payee en janvier, elle apparait dans les stats de decembre au lieu de janvier.

## Donnees actuelles

Pour janvier 2026, les deux methodes donnent le meme resultat (41 factures, 3 012 555 XOF) car il n'y a pas eu de decalage entre creation et paiement. Mais la logique doit etre corrigee pour les cas futurs.

## Solution proposee

### 1. Modifier la fonction RPC `get_invoice_stats`

Ajouter le champ `last_status_change` au retour de la fonction pour permettre le filtrage cote client :

```sql
CREATE OR REPLACE FUNCTION public.get_invoice_stats(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  amount numeric, 
  sales_representative text, 
  status text, 
  created_at timestamp with time zone, 
  user_id uuid, 
  service_description text,
  last_status_change timestamp with time zone  -- NOUVEAU
)
...
```

### 2. Modifier le Dashboard (`DashboardPage.jsx`)

Pour les statistiques de paiement (Leaderboard, montant paye), filtrer les factures payees sur `last_status_change` :

| Statistique | Filtre actuel | Nouveau filtre |
|-------------|---------------|----------------|
| Factures totales | `created_at` | `created_at` (inchange) |
| Montant total | `created_at` | `created_at` (inchange) |
| Factures payees | `created_at` + `status='paid'` | `last_status_change` dans la periode |
| Montant encaisse | `created_at` + `status='paid'` | `last_status_change` dans la periode |
| Leaderboard | `created_at` + `status='paid'` | `last_status_change` dans la periode |

**Nouvelle logique :**
```javascript
// Factures payées dans la période (basé sur la date de paiement)
const paidInPeriod = invoices.filter(inv => {
  if (inv.status !== 'paid') return false;
  const paymentDate = new Date(inv.last_status_change);
  return paymentDate >= startDate && paymentDate <= endDate;
});
```

### 3. Modifier la page Reports (`ReportsPage.jsx`)

Appliquer la meme logique pour les rapports mensuels :
- Les factures generees/envoyees restent filtrees sur `created_at`
- Les montants payes sont filtres sur `last_status_change`

### 4. Modifier le Leaderboard (`Leaderboard.jsx`)

Le composant recevra la date de paiement et filtrera correctement.

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| Migration SQL | Ajouter `last_status_change` a la fonction RPC |
| `src/pages/DashboardPage.jsx` | Filtrer les paiements sur `last_status_change` |
| `src/pages/ReportsPage.jsx` | Idem pour les rapports |
| `src/components/Leaderboard.jsx` | Recevoir et utiliser `last_status_change` |

## Details techniques

### Approche retenue

Plutot que de faire 2 appels RPC separes (un pour created_at, un pour last_status_change), la fonction retournera toutes les factures ayant soit :
- `created_at` dans la periode (pour les stats de generation)
- `last_status_change` dans la periode ET status='paid' (pour les stats de paiement)

Cela garantit que :
1. Une facture creee en janvier mais payee en fevrier apparait dans "Factures generees" de janvier et "Montant encaisse" de fevrier
2. Le Leaderboard reflete les vrais encaissements du mois
