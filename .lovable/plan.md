

# Plan : Ajouter le mode de paiement "Niamey (Aminou)"

## Nouveau mode de paiement

- **ID** : `NiameyAminou`
- **Label** : Paiement a Niamey (Aminou)
- **Icon** : `🇳🇪`
- **Details** : Aminou Laouali Abdou - Tel: +227 78098914 - Via Moneygram/Western Union/Ria

## Fichiers a modifier (7 fichiers)

### 1. `src/components/PaymentTypeSection.jsx`
Ajouter une nouvelle entree dans `PAYMENT_OPTIONS` apres l'option "Niamey" existante :
```
{ id: 'NiameyAminou', label: 'Paiement a Niamey (Aminou)', icon: '🇳🇪', description: 'Via Moneygram/Western Union/Ria', details: 'Aminou Laouali Abdou - +227 78098914' }
```

### 2. `src/pages/CRMPage.jsx`
- Ajouter `{ value: 'NiameyAminou', label: 'Paiement a Niamey (Aminou)' }` dans `PAYMENT_TYPES`
- Ajouter `{ id: 'NiameyAminou', label: 'Niamey (Aminou)', icon: '🇳🇪' }` dans `PAYMENT_OPTIONS`

### 3-5. Templates (`Template1.jsx`, `Template2.jsx`, `Template3.jsx`)
Dans chaque template, ajouter un bloc de rendu pour `types.includes('NiameyAminou')` apres le bloc "Niamey" existant, avec :
- Prenom : Aminou
- Nom : Laouali Abdou
- Telephone : +227 78098914
- Adresse : Niamey - Niger

### 6. `src/pages/ReportsPage.jsx`
Ajouter `'NiameyAminou': MapPin` dans `PAYMENT_ICONS`

### 7. `src/pages/Index.jsx`
Mettre a jour la ligne de fallback `'All'` pour inclure `'NiameyAminou'` si necessaire (ou laisser tel quel si `'All'` ne concerne que les 3 modes originaux)

Aucune migration de base de donnees necessaire - le `payment_type` est stocke en texte libre.

