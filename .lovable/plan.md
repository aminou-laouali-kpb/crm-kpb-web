

# Plan : Mises a jour CRM, Rapports et Logs d'activite

## 1. Upload de recu de paiement avant validation (CRM)

### Base de donnees
- Creer un bucket de stockage `payment-receipts` (public: false)
- Ajouter une colonne `receipt_url` (text, nullable) a la table `invoices`
- Politiques RLS sur le bucket : les utilisateurs authentifies peuvent uploader, les admins/commerciaux peuvent lire

### Code (CRMPage.jsx)
Modifier le dialogue de confirmation de paiement pour ajouter :
- Un champ d'upload de fichier (image ou PDF)
- Upload vers le bucket `payment-receipts` avec le chemin `{invoice_id}/{filename}`
- Stocker l'URL dans `receipt_url` lors de la mise a jour du statut
- Le recu est **obligatoire** avant de pouvoir cliquer "Confirmer"

### Visualisation des recus (Dashboard/Rapports)
- Ajouter une icone cliquable sur les factures payees pour telecharger/voir le recu
- Dans les rapports, ajouter un lien de telechargement dans le detail des factures par mode de paiement

---

## 2. Drill-down sur les modes de paiement (Rapports)

### Code (ReportsPage.jsx)
- Rendre chaque carte de mode de paiement cliquable
- Au clic, ouvrir un Dialog listant les factures payees via ce mode dans le mois selectionne
- Afficher : numero de facture, client, montant, commercial, date de paiement
- Ajouter un lien pour telecharger le recu si disponible

---

## 3. Modification client dans le CRM

Cette fonctionnalite **existe deja** (bouton crayon sur chaque facture, dialogue d'edition avec prenom, nom, email, WhatsApp, montant). Aucune modification necessaire.

---

## 4. Logs d'activite (Admin uniquement)

### Base de donnees
- La table `audit_logs` existe deja
- Mettre a jour la fonction `create_audit_log` pour accepter plus d'actions (ex: 'STATUS_CHANGE', 'EDIT', 'LOGIN', 'EXPORT')
- Ajouter une politique INSERT pour que les utilisateurs authentifies puissent inserer des logs

### Code
- Creer une nouvelle page `src/pages/ActivityLogsPage.jsx`
- Accessible uniquement aux admins (via `useAdminCheck`)
- Afficher les logs recents avec : utilisateur, action, table, date, details (metadata)
- Filtres par date et par type d'action
- Ajouter la route `/activity-logs` dans App.jsx
- Ajouter un bouton "Logs d'activite" dans le CRM (visible admin uniquement)

### Logging des actions
Ajouter des appels `create_audit_log` dans :
- `handleStatusChange` / `handlePaymentConfirm` (changement de statut)
- `handleEditSubmit` (modification de facture)
- `handleDeleteConfirm` (suppression)
- `exportToPDF` dans ReportsPage (export de rapport)

---

## 5. Verification des calculs

Verifier et corriger si necessaire :
- Les totaux dans le Dashboard vs les Rapports utilisent la meme logique (created_at pour total, last_status_change pour paye)
- Le split des payment_type avec virgule dans les rapports
- La deduction des 5% Maketou dans le Leaderboard
- Les taux de conversion (paidInvoices / totalInvoices)

---

## Resume des fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Bucket storage, colonne receipt_url, MAJ create_audit_log, INSERT policy audit_logs |
| `src/pages/CRMPage.jsx` | Upload de recu dans le dialogue de paiement, logging des actions |
| `src/pages/ReportsPage.jsx` | Drill-down cliquable sur modes de paiement, lien recu |
| `src/pages/ActivityLogsPage.jsx` | Nouvelle page logs admin |
| `src/App.jsx` | Ajouter route /activity-logs |

