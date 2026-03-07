

# Plan : Amelioration des rapports avec statistiques detaillees

## Ce qui sera ameliore

Le fichier `src/pages/ReportsPage.jsx` sera reecrit avec les sections suivantes dans cet ordre :

### 1. Resume Global (existant, ameliore)
Memes 4 cartes mais avec un design plus clair.

### 2. Suivi des Paiements par Mode (NOUVEAU - prioritaire)
Cartes individuelles pour chaque mode de paiement (USA/Idriss, France/Virement, Niamey, Wave, Maketou, MyNITA, Especes) montrant :
- Nombre de factures payees via ce mode
- Montant total encaisse via ce mode
- Pourcentage du total encaisse
- Barre de progression visuelle

Basee uniquement sur les factures avec `status === 'paid'` et payees dans la periode (via `last_status_change`). Le champ `payment_type` peut contenir plusieurs valeurs separees par virgule (ex: "USA,France") donc il faudra splitter et comptabiliser chaque mode individuellement.

### 3. Top Services (NOUVEAU)
Classement des services les plus demandes avec :
- Nombre de factures par service
- Montant total et montant paye
- Medaille or/argent/bronze pour le top 3
- Barre de progression proportionnelle au meilleur service

### 4. Repartition par Statut (existant, garde)
PieChart + liste des statuts.

### 5. Graphique Performances par Service (existant, garde)
BarChart comparant montant total vs paye.

### 6. Performances par Commercial (existant, garde)
Table avec stats par commercial.

### Note sur les "pays"
Il n'y a pas de champ "pays" dans la base de donnees. Les modes de paiement (USA, France, Niamey) servent de proxy geographique. La section "Suivi des Paiements par Mode" repondra a ce besoin en montrant ou l'argent est envoye.

## Modifications techniques

### Fichier unique : `src/pages/ReportsPage.jsx`

**Nouvelle fonction `getPaymentTrackingStats()`** :
```javascript
const getPaymentTrackingStats = () => {
  const { startDate, endDate } = getPeriodDates();
  const paymentMap = {};
  let totalPaid = 0;
  
  // Filtrer les factures payees dans la periode
  const paidInvoices = invoices.filter(inv => {
    if (inv.status !== 'paid' || !inv.last_status_change) return false;
    const paymentDate = new Date(inv.last_status_change);
    return paymentDate >= startDate && paymentDate <= endDate;
  });
  
  paidInvoices.forEach(inv => {
    const amount = parseFloat(inv.amount);
    totalPaid += amount;
    // payment_type peut contenir plusieurs valeurs separees par virgule
    const types = (inv.payment_type || 'Non specifie').split(',').map(t => t.trim());
    const splitAmount = amount / types.length;
    types.forEach(type => {
      if (!paymentMap[type]) paymentMap[type] = { count: 0, amount: 0 };
      paymentMap[type].count += 1;
      paymentMap[type].amount += splitAmount;
    });
  });
  
  return { stats: Object.entries(paymentMap).sort((a,b) => b[1].amount - a[1].amount), totalPaid };
};
```

**Nouvelle fonction `getTopServices()`** :
```javascript
// Reutilise getServiceStats() existante mais ajoute un tri et ranking
```

**Nouvelle section UI "Suivi des Paiements"** avec des cartes colorees par mode, incluant une icone representative (drapeau/symbole), le montant, le nombre de factures et un pourcentage.

**Nouvelle section UI "Top Services"** avec classement visuel (medailles), barres de progression.

### Aucune modification de base de donnees necessaire
Toutes les donnees sont deja disponibles via `get_invoice_stats`.

