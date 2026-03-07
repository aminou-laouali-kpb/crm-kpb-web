

# Plan : Correction de l'affichage des factures et ajout de la mise a jour du mode de paiement

## Resume des problemes identifies

### Probleme 1 : Les factures ne s'affichent pas pour les commerciaux

**Cause identifiee** : La politique RLS (Row Level Security) sur la table `invoices` restreint la visibilite :
```sql
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
```

Cette politique fait que chaque commercial ne peut voir **que ses propres factures** (celles ou `user_id` correspond a son ID).

**Utilisateurs actuels :**

| Email | Role | user_id |
|-------|------|---------|
| karatoupostbac@gmail.com | admin | 11e5296a-... |
| donald@karatoupourtous.org | (aucun) | 31c828e1-... |
| richard@karatoupourtous.org | (aucun) | 8c874f09-... |
| josphin@karatoupourtous.com | (aucun) | b9730604-... |
| nadia@karatoupourtous.org | (aucun) | 4e925b61-... |

Seul l'admin peut voir toutes les factures. Les commerciaux ne voient que les leurs.

### Probleme 2 : Mise a jour du mode de paiement lors du marquage "Facture payee"

Actuellement, la fonction `handleStatusChange` ne met a jour que le champ `status`. Les commerciaux veulent pouvoir modifier le mode de paiement (payment_type) quand ils marquent une facture comme payee.

---

## Solution proposee

### 1. Affichage des factures - Deux options possibles

**Option A (Recommandee) : Creer un role "commercial" pour voir toutes les factures**

Attribuer un role `commercial` a tous les vendeurs et mettre a jour la politique RLS pour leur permettre de voir toutes les factures :

```sql
-- Ajouter 'commercial' au type enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'commercial';

-- Mettre a jour la politique RLS
DROP POLICY "Sales reps can view own invoices" ON public.invoices;

CREATE POLICY "Sales reps can view invoices"
  ON public.invoices
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

-- Attribuer le role commercial aux vendeurs
INSERT INTO user_roles (user_id, role)
SELECT id, 'commercial'::app_role 
FROM auth.users 
WHERE email IN ('donald@karatoupourtous.org', 'richard@karatoupourtous.org', 'josphin@karatoupourtous.com', 'nadia@karatoupourtous.org')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Option B : Permettre a tous les utilisateurs authentifies de voir les factures**

Si tous les utilisateurs doivent voir toutes les factures :
```sql
CREATE POLICY "Authenticated users can view invoices"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

### 2. Mise a jour du mode de paiement lors du statut "Facture payee"

**Modifications du code CRMPage.jsx :**

1. Ajouter un etat pour gerer la boite de dialogue de paiement
2. Quand l'utilisateur choisit "paid", afficher une popup pour selectionner le mode de paiement
3. Mettre a jour le statut ET le payment_type en meme temps

```text
+-----------------------------------------------------+
|        Confirmer le paiement                        |
+-----------------------------------------------------+
|                                                     |
|  Mode de paiement utilise par le client :           |
|                                                     |
|  [ ] Paiement aux USA                               |
|  [x] Paiement a Niamey                              |
|  [ ] Virement France                                |
|  [ ] Maketou                                        |
|  [ ] MyNITA                                         |
|  [ ] Wave                                           |
|  [ ] Especes                                        |
|                                                     |
|  [Annuler]                [Confirmer le paiement]   |
+-----------------------------------------------------+
```

---

## Modifications techniques detaillees

### 1. Migration SQL

```sql
-- Ajouter le role 'commercial' au type enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'commercial';

-- Mettre a jour la politique SELECT sur invoices
DROP POLICY IF EXISTS "Sales reps can view own invoices" ON public.invoices;

CREATE POLICY "Sales reps can view invoices"
  ON public.invoices
  FOR SELECT
  USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'commercial'::app_role)
  );

-- Attribuer le role commercial aux vendeurs existants
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('31c828e1-759b-4ec9-9d1e-97d0e098a3fd', 'commercial'),
  ('8c874f09-f0bd-49be-9ed2-268a120038f7', 'commercial'),
  ('b9730604-3efc-4c6c-a994-e73b1ac02a65', 'commercial'),
  ('4e925b61-0cd9-4fbc-93a4-9c61fdf11aa5', 'commercial')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. Modification de CRMPage.jsx

**Nouveaux etats a ajouter :**
```jsx
const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
const [pendingStatusChange, setPendingStatusChange] = useState(null);
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
```

**Options de paiement disponibles :**
```jsx
const PAYMENT_OPTIONS = [
  { id: 'USA', label: 'Paiement aux USA' },
  { id: 'Niamey', label: 'Paiement a Niamey' },
  { id: 'France', label: 'Virement France' },
  { id: 'Maketou', label: 'Maketou (Mobile Money)' },
  { id: 'MyNITA', label: 'MyNITA (Niger)' },
  { id: 'Wave', label: 'Wave (Senegal/CI)' },
  { id: 'Especes', label: 'Especes' }
];
```

**Logique de changement de statut modifiee :**
```jsx
const handleStatusChange = async (invoiceId, newStatus, currentPaymentType) => {
  if (newStatus === 'paid') {
    // Ouvrir la boite de dialogue pour choisir le mode de paiement
    setPendingStatusChange({ invoiceId, newStatus });
    setSelectedPaymentMethod(currentPaymentType || '');
    setPaymentDialogOpen(true);
    return;
  }
  // Pour les autres statuts, mise a jour directe
  await updateInvoiceStatus(invoiceId, newStatus);
};

const handlePaymentConfirm = async () => {
  if (!selectedPaymentMethod) {
    toast.error("Veuillez selectionner un mode de paiement");
    return;
  }
  
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase
    .from('invoices')
    .update({ 
      status: 'paid',
      payment_type: selectedPaymentMethod 
    })
    .eq('id', pendingStatusChange.invoiceId);
    
  if (error) {
    toast.error("Erreur lors de la mise a jour");
    return;
  }
  
  toast.success("Facture marquee comme payee");
  setPaymentDialogOpen(false);
  fetchInvoices();
};
```

**Nouvelle boite de dialogue a ajouter :**
```jsx
<Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmer le paiement</DialogTitle>
      <DialogDescription>
        Selectionnez le mode de paiement utilise par le client
      </DialogDescription>
    </DialogHeader>
    <RadioGroup 
      value={selectedPaymentMethod} 
      onValueChange={setSelectedPaymentMethod}
    >
      {PAYMENT_OPTIONS.map((option) => (
        <div key={option.id} className="flex items-center space-x-2">
          <RadioGroupItem value={option.id} id={option.id} />
          <Label htmlFor={option.id}>{option.label}</Label>
        </div>
      ))}
    </RadioGroup>
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
        Annuler
      </Button>
      <Button onClick={handlePaymentConfirm}>
        Confirmer le paiement
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| Migration SQL | Ajouter role 'commercial', MAJ politique RLS, attribuer roles |
| `src/pages/CRMPage.jsx` | Ajouter popup de confirmation paiement avec selection mode |

---

## Avantages de cette solution

1. **Securite preservee** : Seuls les commerciaux autorises (avec le role) peuvent voir toutes les factures
2. **Flexibilite** : On peut facilement retirer l'acces a un commercial en supprimant son role
3. **Traçabilite** : Le mode de paiement reel est enregistre au moment du paiement
4. **UX amelioree** : Le commercial confirme explicitement le paiement avec le bon mode

