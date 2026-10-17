# KPB Education — CRM & Générateur de Factures

Application interne de **KPB Education** pour la gestion commerciale : création de factures brandées, suivi CRM, dashboard de performance, comptabilité et rapports.

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| Générateur | `/` | Création de factures avec 3 templates PDF |
| CRM | `/crm` | Suivi des statuts, relances, reçus de paiement |
| Dossiers | `/dossiers` | Suivi des procédures par les agents : Ma journée, Kanban, Tableau, Suivi équipe |
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
| `agent` | Espace Dossiers uniquement |
| `contractuel` | Espace Dossiers uniquement, limité aux procédures de son périmètre |

Les comptes sont créés par un admin dans **Paramètres → Utilisateurs et accès** (fonction `admin-users`). Une inscription spontanée ne reçoit aucun rôle : le compte reste « en attente d'activation ». Un commercial rattaché à son compte facture toujours en son propre nom.

Une facture payée est verrouillée côté base : seul un admin peut en changer le statut, le montant ou la devise. Le passage en « payée » exige un reçu.

## Parcours utilisateur

1. **Connexion** sur `/auth`
2. **Créer une facture** : remplir le formulaire, choisir un template
3. **Télécharger le PDF** sur `/template`, marquer comme envoyée
4. **Suivre dans le CRM** : avancer le statut jusqu'à « payée » + upload reçu
5. **Consulter le dashboard** pour les performances mensuelles

## Dossiers (suivi des procédures)

- **Création automatique** : dès qu'une facture passe « payée » (hors Guide ultime), un dossier est ouvert et confié au responsable de sa procédure (Paramètres → Dossiers : affectation automatique). Les agents peuvent aussi créer des dossiers hors CRM ; une facture payée plus tard pour le même email y est rattachée.
- **Étapes communes** : 0. Candidature non démarrée → 1. Informations demandées → 2. Informations reçues → 3. Remplissage en cours → 4. Remplissage terminé → 5. Dossier finalisé / soumis → 6. Réponse reçue (admis / refusé / liste d'attente) → 7. Visa démarré → 8. Visa demandé → 9. Visa reçu / refusé. Statuts : actif, en pause, clôturé (succès / échec), abandonné ; indicateur « Bloqué » avec motif.
- **Journal** : commentaire obligatoire à chaque changement d'étape, point du jour (un par dossier et par jour, du lundi au vendredi), notes commerciales. Le journal n'est pas modifiable (seul l'admin corrige). Toutes les écritures passent par des fonctions SQL contrôlées.
- **Accès** : admin, commerciaux et agents voient tous les dossiers ; un contractuel ne voit que les procédures de son périmètre et les dossiers qui lui sont confiés. Seuls le responsable, ses intervenants et l'admin font avancer un dossier ; les commerciaux commentent.

## Statuts de facture

```
generated → sent → awaiting_payment → to_follow_up → paid
```

Les factures non mises à jour après le plus petit seuil configuré (défaut : 7 jours, réglable dans Paramètres pour toute l'équipe) passent automatiquement en « À relancer ».

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
