
# Plan : Système de filtrage avancé pour la page CRM

## Objectif
Ajouter des filtres supplémentaires sur la page Gestion CRM pour permettre un tri plus precis des factures par : methode de paiement, mois/annee, et type de service.

## Situation actuelle

La page CRM dispose actuellement de 3 filtres :
- **Recherche** : par nom du client ou numero de facture
- **Commercial** : Josphin, Nadia, Donald, Richard
- **Statut** : genere, envoye, en attente, a relancer, paye

## Nouveaux filtres a ajouter

| Filtre | Valeurs disponibles | Donnees source |
|--------|---------------------|----------------|
| **Methode de paiement** | All, USA, Niamey, France | `payment_type` dans la table `invoices` |
| **Mois** | Janvier - Decembre | Extrait de `created_at` |
| **Annee** | 2020 - Annee actuelle + 1 | Extrait de `created_at` |
| **Service** | Liste dynamique des services existants | `service_description` (avec recherche/autocomplete) |

## Modifications techniques

### 1. Nouveaux etats de filtre

```javascript
// Nouveaux filtres
const [filterPaymentType, setFilterPaymentType] = useState('all');
const [filterMonth, setFilterMonth] = useState('all');
const [filterYear, setFilterYear] = useState('all');
const [filterService, setFilterService] = useState('all');
```

### 2. Extraction des services uniques

```javascript
// Extraire les services uniques des factures chargees
const uniqueServices = useMemo(() => {
  const services = [...new Set(invoices.map(inv => inv.service_description))];
  return services.filter(Boolean).sort();
}, [invoices]);
```

### 3. Logique de filtrage mise a jour

```javascript
const filteredInvoices = invoices.filter(invoice => {
  // Filtres existants
  const matchesSearch = ...;
  const matchesSalesRep = ...;
  const matchesStatus = ...;
  
  // Nouveaux filtres
  const matchesPaymentType = filterPaymentType === 'all' || 
    invoice.payment_type === filterPaymentType;
  
  const invoiceDate = new Date(invoice.created_at);
  const matchesMonth = filterMonth === 'all' || 
    (invoiceDate.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
  
  const matchesYear = filterYear === 'all' || 
    invoiceDate.getFullYear().toString() === filterYear;
  
  const matchesService = filterService === 'all' || 
    invoice.service_description === filterService;

  return matchesSearch && matchesSalesRep && matchesStatus && 
         matchesPaymentType && matchesMonth && matchesYear && matchesService;
});
```

### 4. Interface utilisateur des filtres

Reorganiser les filtres sur 2 lignes pour mobile et 4 colonnes sur desktop :

**Ligne 1 :**
- Barre de recherche (pleine largeur)

**Ligne 2 (grille) :**
- Commercial
- Statut
- Methode de paiement
- Service

**Ligne 3 (grille) :**
- Mois
- Annee
- Bouton "Reinitialiser les filtres"

### 5. Bouton de reinitialisation

Ajouter un bouton pour effacer tous les filtres d'un coup :

```javascript
const resetFilters = () => {
  setSearchTerm('');
  setFilterSalesRep('all');
  setFilterStatus('all');
  setFilterPaymentType('all');
  setFilterMonth('all');
  setFilterYear('all');
  setFilterService('all');
};
```

### 6. Affichage du nombre de resultats

Ajouter un compteur de resultats filtres :

```javascript
<div className="text-sm text-gray-500 mb-2">
  {filteredInvoices.length} facture(s) trouvee(s)
</div>
```

## Structure du code modifie

```text
src/pages/CRMPage.jsx
  |
  +-- Imports supplementaires (useMemo, Calendar, X icons)
  |
  +-- Constantes (MONTHS, PAYMENT_TYPES)
  |
  +-- Nouveaux etats de filtre
  |
  +-- useMemo pour services uniques et annees
  |
  +-- Fonction resetFilters
  |
  +-- Logique de filtrage etendue
  |
  +-- Interface des filtres reorganisee
  |
  +-- Compteur de resultats
```

## Valeurs des selecteurs

**Methode de paiement :**
- "Toutes les methodes" (all)
- "Paiement aux USA" (USA)
- "Paiement a Niamey" (Niamey)
- "Paiement en France" (France)
- "Toutes les options" (All)

**Mois :**
- "Tous les mois" (all)
- Janvier - Decembre (01-12)

**Annees :**
- "Toutes les annees" (all)
- 2020 jusqu'a l'annee courante + 1

**Services :**
- "Tous les services" (all)
- Liste dynamique des services existants

## Fichier a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/CRMPage.jsx` | Ajout des etats, logique de filtrage, interface des filtres |

## Design responsive

- **Mobile** : Filtres empiles verticalement (1 colonne)
- **Tablette** : Grille 2 colonnes
- **Desktop** : Grille 3-4 colonnes

## Resultat attendu

- Filtrage instantane cote client (pas de requete supplementaire)
- Interface claire et intuitive
- Possibilite de combiner plusieurs filtres
- Reinitialisation rapide de tous les filtres
- Indicateur du nombre de resultats
