
# Plan : Mise a jour des moyens de paiement

## Resume des changements

Ajouter 4 nouveaux moyens de paiement et passer d'une selection unique a une selection multiple (maximum 3 types).

## Nouveaux moyens de paiement

| ID | Nom | Description | Coordonnees |
|----|-----|-------------|-------------|
| `Maketou` | Maketou | Agregateur mobile money (Wave, Orange Money, Airtel Money, MTN Money) | Lien de paiement envoye avec la facture |
| `MyNITA` | MyNITA (Niger) | Paiement mobile Niger | Aminou Laouali Abdou, +227 76929799 |
| `Wave` | Wave (Senegal/Cote d'Ivoire) | Paiement mobile Wave | Aminou Laouali Abdou, +227 76929799 |
| `Especes` | Especes | Paiement en especes | Contact du commercial |

## Liste complete des moyens de paiement (apres modification)

1. **USA** - Moneygram/Western Union/Ria (Idriss Laouali Abdou, Bellevue, WA)
2. **Niamey** - Moneygram/Western Union/Ria (Judicael Mahoutin Djidonou, Niamey)
3. **France** - Virement bancaire (IBAN: FR76 1695 8000...)
4. **Maketou** - Mobile Money agregateur (lien de paiement)
5. **MyNITA** - Paiement mobile Niger (Aminou Laouali Abdou, +227 76929799)
6. **Wave** - Wave Senegal/Cote d'Ivoire (Aminou Laouali Abdou, +227 76929799)
7. **Especes** - Paiement en especes

## Changements techniques

### 1. Modification du composant de selection (`PaymentTypeSection.jsx`)

**Avant :** RadioGroup (selection unique) avec option "All"
**Apres :** Checkboxes (selection multiple) avec limite de 3

```javascript
// Nouveau state : tableau au lieu de string
const [selectedPayments, setSelectedPayments] = useState(['USA']);

// Constante pour les options disponibles
const PAYMENT_OPTIONS = [
  { id: 'USA', label: 'Paiement aux USA', icon: '🇺🇸', 
    description: 'Via Moneygram/Western Union/Ria - Idriss Laouali Abdou, Bellevue, WA' },
  { id: 'Niamey', label: 'Paiement a Niamey', icon: '🇳🇪',
    description: 'Via Moneygram/Western Union/Ria - Judicael Mahoutin Djidonou' },
  { id: 'France', label: 'Virement bancaire France', icon: '🇫🇷',
    description: 'IBAN: FR76 1695 8000 0185 1038 3000 480' },
  { id: 'Maketou', label: 'Maketou', icon: '📱',
    description: 'Mobile Money (Wave, Orange Money, Airtel Money, MTN)' },
  { id: 'MyNITA', label: 'MyNITA (Niger)', icon: '💳',
    description: 'Aminou Laouali Abdou - +227 76929799' },
  { id: 'Wave', label: 'Wave (Senegal/Cote d\'Ivoire)', icon: '🌊',
    description: 'Aminou Laouali Abdou - +227 76929799' },
  { id: 'Especes', label: 'Especes', icon: '💵',
    description: 'Paiement en especes - Contact du commercial' }
];
```

### 2. Logique de selection multiple

```javascript
const handlePaymentToggle = (paymentId) => {
  setSelectedPayments(prev => {
    if (prev.includes(paymentId)) {
      // Deselection (minimum 1)
      if (prev.length === 1) return prev;
      return prev.filter(p => p !== paymentId);
    } else {
      // Selection (maximum 3)
      if (prev.length >= 3) {
        toast.warning("Maximum 3 moyens de paiement");
        return prev;
      }
      return [...prev, paymentId];
    }
  });
};
```

### 3. Modification de l'interface (`PaymentTypeSection.jsx`)

Remplacer les RadioGroupItem par des Checkbox avec :
- Indicateur visuel du nombre selectionne (1/3, 2/3, 3/3)
- Message d'aide "Selectionnez jusqu'a 3 moyens de paiement"
- Style different pour les cases cochees

### 4. Modification du state dans `Index.jsx`

```javascript
// Avant
const [paymentType, setPaymentType] = useState("USA");

// Apres
const [selectedPayments, setSelectedPayments] = useState(["USA"]);
```

### 5. Mise a jour des templates (Template1, Template2, Template3)

Modifier la logique d'affichage pour iterer sur le tableau :

```javascript
// Avant
paymentInfo = { type: 'USA' }
{(paymentInfo.type === 'USA' || paymentInfo.type === 'All') && (...)}

// Apres
paymentInfo = { types: ['USA', 'Wave'] }
{paymentInfo.types.includes('USA') && (...)}
```

Ajouter les sections pour les nouveaux moyens de paiement :

```javascript
{paymentInfo.types.includes('Maketou') && (
  <div>
    <p className="font-semibold text-blue-600 text-xs">📱 Maketou - Mobile Money</p>
    <p className="text-xs">Wave, Orange Money, Airtel Money, MTN Money</p>
    <p className="text-xs mt-1">Un lien de paiement vous sera envoye par email/WhatsApp</p>
  </div>
)}

{paymentInfo.types.includes('MyNITA') && (
  <div>
    <p className="font-semibold text-blue-600 text-xs">💳 MyNITA (Niger)</p>
    <p className="text-xs"><strong>Prenom:</strong> Aminou</p>
    <p className="text-xs"><strong>Nom:</strong> Laouali Abdou</p>
    <p className="text-xs"><strong>Telephone:</strong> +227 76929799</p>
  </div>
)}

{paymentInfo.types.includes('Wave') && (
  <div>
    <p className="font-semibold text-blue-600 text-xs">🌊 Wave (Senegal/Cote d'Ivoire)</p>
    <p className="text-xs"><strong>Prenom:</strong> Aminou</p>
    <p className="text-xs"><strong>Nom:</strong> Laouali Abdou</p>
    <p className="text-xs"><strong>Telephone:</strong> +227 76929799</p>
  </div>
)}

{paymentInfo.types.includes('Especes') && (
  <div>
    <p className="font-semibold text-blue-600 text-xs">💵 Paiement en especes</p>
    <p className="text-xs">Contactez votre commercial pour organiser le paiement</p>
  </div>
)}
```

### 6. Mise a jour de la base de donnees

Le champ `payment_type` dans la table `invoices` stocke actuellement une seule valeur (string). 
Options :
- **Option A** : Stocker un tableau JSON (ex: `["USA", "Wave"]`)
- **Option B** : Stocker une chaine separee par virgules (ex: `"USA,Wave"`)

Je recommande l'Option B pour la simplicite et la compatibilite avec les factures existantes.

```javascript
// Sauvegarde
payment_type: selectedPayments.join(',')

// Lecture
const paymentTypes = invoice.payment_type.split(',');
```

## Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/PaymentTypeSection.jsx` | Refonte complete : Checkbox au lieu de Radio, liste des 7 options |
| `src/pages/Index.jsx` | Changer le state de string a array, adapter handlePaymentTypeChange |
| `src/components/templates/Template1.jsx` | Ajouter les 4 nouveaux moyens, adapter la logique d'affichage |
| `src/components/templates/Template2.jsx` | Idem |
| `src/components/templates/Template3.jsx` | Idem |

## Interface utilisateur finale

```text
+----------------------------------------------------------+
|  Moyens de paiement (2/3 selectionnes)                   |
+----------------------------------------------------------+
|                                                          |
|  [x] 🇺🇸 Paiement aux USA                                |
|      Via Moneygram/Western Union/Ria                     |
|                                                          |
|  [ ] 🇳🇪 Paiement a Niamey                               |
|      Via Moneygram/Western Union/Ria                     |
|                                                          |
|  [ ] 🇫🇷 Virement bancaire France                        |
|      IBAN: FR76 1695 8000...                             |
|                                                          |
|  [ ] 📱 Maketou                                          |
|      Mobile Money (Wave, Orange Money, Airtel, MTN)      |
|                                                          |
|  [x] 💳 MyNITA (Niger)                                   |
|      Aminou Laouali Abdou - +227 76929799                |
|                                                          |
|  [ ] 🌊 Wave (Senegal/Cote d'Ivoire)                     |
|      Aminou Laouali Abdou - +227 76929799                |
|                                                          |
|  [ ] 💵 Especes                                          |
|      Paiement en especes - Contact du commercial         |
|                                                          |
+----------------------------------------------------------+
```

## Compatibilite avec les donnees existantes

Les factures existantes ont `payment_type` = "USA", "Niamey", "France" ou "All".
- "USA", "Niamey", "France" : Convertis en tableau a un element
- "All" : Converti en `["USA", "Niamey", "France"]` (les 3 anciens moyens)

```javascript
// Lors de la lecture d'une facture existante
const normalizePaymentTypes = (paymentType) => {
  if (paymentType === 'All') {
    return ['USA', 'Niamey', 'France'];
  }
  return paymentType.split(',');
};
```
