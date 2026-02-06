
# Plan : Correction des problemes de selection de paiement et bilans commerciaux

## Resume des problemes

1. **Moyens de paiement** : Double declenchement de l'evenement click causant un toggle/anti-toggle
2. **Bilans commerciaux** : Restriction aux admins uniquement apres la derniere migration de securite

---

## Probleme 1 : Selection des moyens de paiement

### Cause
Le composant `PaymentTypeSection.jsx` a deux gestionnaires d'evenements qui interferent :
- `onClick` sur le conteneur `<div>` parent
- `onCheckedChange` sur le composant `Checkbox`

Quand on clique sur le checkbox, les deux evenements se declenchent, provoquant une selection puis une deselection immediate.

### Solution
Empecher la propagation de l'evenement sur le `Checkbox` avec `stopPropagation()` :

```javascript
<Checkbox
  id={option.id}
  checked={isSelected}
  onCheckedChange={(e) => {
    // Ne pas propager pour eviter le double toggle
    handleToggle(option.id);
  }}
  onClick={(e) => e.stopPropagation()}
  className="mt-1"
/>
```

### Fichier a modifier
`src/components/PaymentTypeSection.jsx`

---

## Probleme 2 : Bilans commerciaux (Dashboard)

### Cause
Deux elements bloquent :

1. **Migration de securite** : La fonction `get_invoice_stats` exige maintenant le role `admin`
2. **RLS sur la table invoices** : La politique SELECT ne permet de voir que ses propres factures

### Analyse des utilisateurs actuels

| Email | Role |
|-------|------|
| karatoupostbac@gmail.com | admin |
| donald@karatoupourtous.org | (aucun) |
| josphin@karatoupourtous.com | (aucun) |
| nadia@karatoupourtous.org | (aucun) |
| richard@karatoupourtous.org | (aucun) |

Seul l'admin peut voir toutes les factures actuellement.

### Solution proposee

Modifier la fonction `get_invoice_stats` pour permettre aux utilisateurs authentifies de voir les statistiques (sans informations clients sensibles), car cette fonction ne retourne deja pas de donnees clients (pas de nom, email, WhatsApp).

```sql
-- Au lieu de bloquer tous les non-admins
IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
  RAISE EXCEPTION 'Access denied';
END IF;

-- Permettre l'acces en lecture aux utilisateurs authentifies
-- La fonction ne retourne pas de donnees clients sensibles
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Authentication required';
END IF;
```

### Alternative plus restrictive
Si vous preferez que seuls les admins voient les bilans de tous les commerciaux, alors le comportement actuel est correct, mais l'interface devrait indiquer clairement que cette fonctionnalite est reservee aux administrateurs.

### Fichiers/ressources a modifier
1. Migration SQL pour mettre a jour `get_invoice_stats`

---

## Modifications techniques detaillees

### 1. PaymentTypeSection.jsx

**Avant :**
```jsx
<Checkbox
  id={option.id}
  checked={isSelected}
  onCheckedChange={() => handleToggle(option.id)}
  className="mt-1"
/>
```

**Apres :**
```jsx
<Checkbox
  id={option.id}
  checked={isSelected}
  onCheckedChange={() => handleToggle(option.id)}
  onClick={(e) => e.stopPropagation()}
  className="mt-1"
/>
```

### 2. Migration SQL pour get_invoice_stats

```sql
DROP FUNCTION IF EXISTS public.get_invoice_stats(timestamp with time zone, timestamp with time zone);

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
  last_status_change timestamp with time zone,
  payment_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verifier que l'utilisateur est authentifie
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
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
END;
$$;
```

---

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/components/PaymentTypeSection.jsx` | Ajouter `onClick={(e) => e.stopPropagation()}` au Checkbox |
| Migration SQL | Permettre l'acces a `get_invoice_stats` a tous les utilisateurs authentifies |

---

## Note de securite

La fonction `get_invoice_stats` ne retourne **pas** d'informations clients sensibles :
- PAS de client_first_name
- PAS de client_last_name  
- PAS de client_email
- PAS de client_whatsapp

Elle retourne uniquement : id, amount, sales_representative, status, dates, et payment_type.

Donc permettre a tous les utilisateurs authentifies d'y acceder ne pose pas de probleme de securite car :
1. Les commerciaux ont besoin de ces stats pour leur motivation (Leaderboard)
2. Aucune donnee personnelle client n'est exposee
3. La table `invoices` reste protegee par RLS pour les requetes directes

