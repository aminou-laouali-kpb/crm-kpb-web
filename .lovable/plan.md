
# Plan : Frais Maketou 5% et Systeme de Commissions/Points

## Resume

Ce plan couvre deux fonctionnalites principales :

1. **Gestion des frais Maketou (5%)** : Les paiements via Maketou sont soumis a 5% de frais de service, donc seuls 95% du montant sont enregistres comme revenus reels.

2. **Systeme de commissions et points** : Afficher sur le Leaderboard les commissions mensuelles et les points accumules par chaque commercial.

---

## Partie 1 : Frais Maketou (5%)

### Logique metier

- Maketou preleve **5% de frais** sur chaque transaction
- Le montant reel recu = **montant facture x 0.95**
- Cette deduction s'applique **uniquement** aux factures dont le `payment_type` contient "Maketou"

### Modifications necessaires

**1. Fonction RPC `get_invoice_stats`**

Ajouter le champ `payment_type` au retour pour permettre le calcul des frais Maketou cote client :

```sql
RETURNS TABLE(
  id uuid, 
  amount numeric, 
  sales_representative text, 
  status text, 
  created_at timestamp with time zone, 
  user_id uuid, 
  service_description text,
  last_status_change timestamp with time zone,
  payment_type text  -- NOUVEAU
)
```

**2. Fonction utilitaire de calcul du montant reel**

```javascript
// src/utils/commissionCalculations.js
export const MAKETOU_FEE_RATE = 0.05; // 5%

export const getNetAmount = (amount, paymentType) => {
  // Si le paiement inclut Maketou, deduire 5%
  if (paymentType && paymentType.includes('Maketou')) {
    return amount * (1 - MAKETOU_FEE_RATE);
  }
  return amount;
};
```

**3. Application dans le Dashboard et Leaderboard**

Le montant net sera utilise pour :
- Calcul des revenus reels affiches
- Calcul des commissions (base sur le montant reel recu)

---

## Partie 2 : Systeme de Commissions

### Regles de commission

| Type | Calcul | Condition |
|------|--------|-----------|
| Commission de base | 10% du montant net recu | Chaque vente payee |
| Bonus palier | +10 000 FCFA | Total ventes >= 850 000 FCFA |
| Bonus 1er vendeur | +15 000 FCFA | Meilleur vendeur du mois |

### Formule de calcul

```javascript
// Pour chaque commercial
const calculateCommission = (rep) => {
  // 1. Calculer le montant net total (avec deduction Maketou)
  const netSales = repInvoices.reduce((sum, inv) => {
    const amount = parseFloat(inv.amount);
    return sum + getNetAmount(amount, inv.payment_type);
  }, 0);
  
  // 2. Commission de base : 10%
  const baseCommission = netSales * 0.10;
  
  // 3. Bonus palier 850k
  const tierBonus = netSales >= 850000 ? 10000 : 0;
  
  // 4. Bonus 1er vendeur (attribue apres le tri)
  const topSellerBonus = isTopSeller ? 15000 : 0;
  
  // Total
  return {
    baseCommission,
    tierBonus,
    topSellerBonus,
    totalCommission: baseCommission + tierBonus + topSellerBonus
  };
};
```

---

## Partie 3 : Systeme de Points

### Regles d'attribution des points

| Position | Points du mois |
|----------|----------------|
| 1er | 10 points |
| 2eme | 5 points |
| 3eme | 3 points |
| 4eme+ | 0 point |

### Stockage des points

Il faut creer une nouvelle table pour stocker l'historique des points :

```sql
CREATE TABLE sales_rep_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep text NOT NULL,  -- Nom du commercial
  month integer NOT NULL,   -- Mois (1-12)
  year integer NOT NULL,    -- Annee
  points integer NOT NULL DEFAULT 0,
  position integer NOT NULL,  -- Position au classement
  total_sales numeric NOT NULL,  -- Total des ventes ce mois
  created_at timestamptz DEFAULT now(),
  UNIQUE(sales_rep, month, year)  -- Un seul enregistrement par commercial/mois
);
```

### Calcul des points trimestriels

```javascript
// Trimestres : Jan-Mar, Avr-Juin, Juil-Sep, Oct-Dec
const getQuarterlyPoints = (rep, currentMonth, currentYear) => {
  const quarter = Math.floor((currentMonth - 1) / 3);
  const quarterStartMonth = quarter * 3 + 1;
  const quarterEndMonth = quarterStartMonth + 2;
  
  // Sommer les points du trimestre en cours
  return pointsHistory
    .filter(p => 
      p.sales_rep === rep && 
      p.year === currentYear && 
      p.month >= quarterStartMonth && 
      p.month <= quarterEndMonth
    )
    .reduce((sum, p) => sum + p.points, 0);
};
```

---

## Partie 4 : Affichage sur le Leaderboard

### Nouveau design du tableau

```text
+----------------------------------------------------------+
|  Classement du mois - Janvier 2026                       |
+----------------------------------------------------------+
|                                                          |
|  🏆 1. Josphin                                           |
|      Ventes: 1 200 000 FCFA (2 ventes)                   |
|      Net: 1 140 000 FCFA (apres frais Maketou)           |
|      Commission: 114 000 + 10 000 + 15 000 = 139 000 FCFA|
|      Points: 10 pts (mois) | 25 pts (trimestre)          |
|                                                          |
|  🥈 2. Nadia                                             |
|      Ventes: 900 000 FCFA (3 ventes)                     |
|      Net: 900 000 FCFA                                   |
|      Commission: 90 000 + 10 000 = 100 000 FCFA          |
|      Points: 5 pts (mois) | 15 pts (trimestre)           |
|                                                          |
+----------------------------------------------------------+
```

### Informations affichees par commercial

| Element | Description |
|---------|-------------|
| Ventes totales | Montant brut des factures payees |
| Montant net | Apres deduction frais Maketou (5%) |
| Commission de base | 10% du montant net |
| Bonus palier | +10k si >= 850k |
| Bonus 1er | +15k pour le meilleur vendeur |
| Total commission | Somme a payer au commercial |
| Points du mois | 10/5/3/0 selon la position |
| Points trimestre | Cumul des 3 mois du trimestre |

---

## Fichiers a creer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/migrations/xxx.sql` | Creer | Table `sales_rep_points` + MAJ RPC |
| `src/utils/commissionCalculations.js` | Creer | Fonctions de calcul commissions/points |
| `src/components/Leaderboard.jsx` | Modifier | Afficher commissions et points |
| `src/pages/DashboardPage.jsx` | Modifier | Passer payment_type au Leaderboard |

---

## Migration SQL

```sql
-- 1. Creer la table des points
CREATE TABLE public.sales_rep_points (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep text NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  points integer NOT NULL DEFAULT 0,
  position integer NOT NULL CHECK (position >= 1 AND position <= 4),
  total_sales numeric NOT NULL DEFAULT 0,
  net_sales numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sales_rep, month, year)
);

-- 2. RLS pour la table
ALTER TABLE public.sales_rep_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage points"
  ON public.sales_rep_points
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "All users can view points"
  ON public.sales_rep_points
  FOR SELECT
  USING (true);

-- 3. Mettre a jour la fonction RPC pour inclure payment_type
DROP FUNCTION IF EXISTS public.get_invoice_stats(timestamp with time zone, timestamp with time zone);

CREATE FUNCTION public.get_invoice_stats(
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
  last_status_change timestamp with time zone,
  payment_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    i.id,
    i.amount,
    i.sales_representative::text,
    i.status::text,
    i.created_at,
    i.user_id,
    i.service_description,
    i.last_status_change,
    i.payment_type
  FROM public.invoices i
  WHERE 
    (
      (p_start_date IS NULL OR i.created_at >= p_start_date)
      AND (p_end_date IS NULL OR i.created_at <= p_end_date)
    )
    OR
    (
      i.status = 'paid'
      AND (p_start_date IS NULL OR i.last_status_change >= p_start_date)
      AND (p_end_date IS NULL OR i.last_status_change <= p_end_date)
    );
$$;
```

---

## Workflow d'utilisation

1. **En temps reel** : Le Leaderboard calcule automatiquement les commissions et affiche les points du trimestre

2. **Sauvegarde mensuelle (optionnelle)** : Un bouton "Valider le mois" permet a l'admin de sauvegarder les points dans la base de donnees pour l'historique trimestriel

3. **Fin de trimestre** : L'admin peut voir le cumul des points et attribuer le prix au gagnant

---

## Constantes de configuration

```javascript
// src/utils/commissionCalculations.js
export const COMMISSION_CONFIG = {
  MAKETOU_FEE_RATE: 0.05,       // 5% de frais Maketou
  BASE_COMMISSION_RATE: 0.10,   // 10% de commission de base
  TIER_THRESHOLD: 850000,       // Seuil pour le bonus palier
  TIER_BONUS: 10000,            // Bonus palier 850k
  TOP_SELLER_BONUS: 15000,      // Bonus meilleur vendeur
  POINTS_BY_POSITION: [10, 5, 3, 0]  // Points par position
};
```
