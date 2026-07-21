# KPB Education — CRM & Générateur de Factures

Application interne de **KPB Education** pour la gestion commerciale : création de factures brandées, suivi CRM, dashboard de performance, comptabilité et rapports.

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| Générateur | `/` | Création de factures avec 3 templates PDF |
| CRM | `/crm` | Suivi des statuts, relances, reçus de paiement |
| Dashboard | `/dashboard` | KPIs mensuels, classement commercial, commissions |
| Rapports | `/reports` | Analyses et export PDF |
| Comptabilité | `/accounting` | Dépenses, budgets, revenus (admin/comptable) |
| Paramètres | `/settings` | Relances configurables, gestion commerciaux (admin) |
| Logs | `/activity-logs` | Journal d'audit (admin) |

## Stack technique

- **Frontend** : React 18, Vite, Tailwind CSS, shadcn/ui
- **Backend** : Supabase (PostgreSQL, Auth, Storage, RLS)
- **Data** : TanStack React Query
- **PDF** : html2canvas + jsPDF

## Installation locale

```bash
git clone <repo-url>
cd <project>
npm install
cp .env.example .env   # si disponible
npm run dev
```

Variables d'environnement requises (`.env`) :
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

## Rôles utilisateurs

| Rôle | Permissions |
|------|-------------|
| `commercial` | Créer/voir ses factures, CRM, dashboard |
| `comptable` | + Comptabilité (dépenses, exports) |
| `admin` | Accès complet, logs, paramètres, gestion rôles |

Les nouveaux comptes reçoivent automatiquement le rôle `commercial` (trigger Supabase).

## Parcours utilisateur

1. **Connexion** sur `/auth`
2. **Créer une facture** : remplir le formulaire, choisir un template
3. **Télécharger le PDF** sur `/template`, marquer comme envoyée
4. **Suivre dans le CRM** : avancer le statut jusqu'à « payée » + upload reçu
5. **Consulter le dashboard** pour les performances mensuelles

## Statuts de facture

```
generated → sent → awaiting_payment → to_follow_up → paid
```

Les factures non mises à jour après le seuil configuré (défaut : 7 jours) passent automatiquement en « À relancer ».

## Règles de commission

- **Base** : 10 % des ventes nettes
- **Bonus palier** : +10 000 XOF si ≥ 850 000 XOF de ventes nettes
- **Bonus 1er vendeur** : +15 000 XOF
- **Frais Maketou** : -5 % déduits du montant brut
- **Points mensuels** : 1er = 10 pts, 2e = 5 pts, 3e = 3 pts

## Commandes

```bash
npm run dev      # Serveur de développement
npm run build    # Build production
npm run lint     # ESLint
npm run test     # Tests unitaires (Vitest)
```

## Déploiement

L'application peut être déployée via GPT Engineer/Lovable ou sur Netlify/Vercel avec les variables d'environnement Supabase configurées.

## Contact

KPB Education — 8 Rue André Vasseur, 31200 Toulouse — SIRET 851 365 908 00025
