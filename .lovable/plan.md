# Dépenses récurrentes : Avril → Août 2026 + modèle mensuel réutilisable

## 1. Modèle de dépenses récurrentes (nouveau)

Une liste de dépenses types, modifiable, que tu appliques en un clic à n'importe quel mois.

- Nouvelle liste "Modèle mensuel" gérée dans la page Comptabilité (admin uniquement) : chaque ligne = description, montant, catégorie, jour du mois, période de validité (à partir de / jusqu'à).
- Bouton **"Appliquer le modèle à ce mois"** dans l'onglet Dépenses : crée toutes les lignes valides du modèle pour le mois affiché, en statut "En attente".
- Sécurité anti-doublon : une ligne déjà présente pour ce mois (même description) n'est pas recréée. Un aperçu s'affiche avant validation.
- Après application, chaque dépense reste modifiable ou supprimable normalement.

## 2. Contenu du modèle (à partir d'avril 2026)

**Salaires fixes**
- Aminou 350 000 · Judicaël 100 000 · Khadidja 60 000 · Joanna 65 000 · Harouna 25 000
- Bassit 50 000 — actif à partir de juin 2026

**Salaires commerciaux** (base + commission du tableau de bord)
- Josphin : base 50 000 · Richard et Donald : base 40 000
- Ces lignes sont créées avec la commission réelle du mois, calculée comme dans le classement (net après frais Maketou 5 %, 10 % de commission, +10 000 au-delà de 850 000, +15 000 meilleur vendeur).

**Charges de fonctionnement**
- Loyer 150 000 · Électricité 30 000 · Starlink 32 000 · Videur d'ordures 3 000
- Produits de ménage 18 000 — 2 mois sur 3 (avril, juin, août…)

**Abonnements / outils**
- Captions 17 000 · e& Dubai 25 000 · API OpenAI/OpenRouter 12 000
- Google Workspace + Gemini 16 000 — jusqu'à mai 2026 inclus
- Claude (2 sièges Team + 1 Premium, offre non profit) 32 000 — à partir de juin 2026

**Publicité**
- TikTok Ads : 150 000 / mois
- Meta Ads : montants réels extraits de ton relevé Qonto (converti au taux fixe 655,957 XOF/EUR)
  - Avril 84 474 · Mai 235 921 · Juin 195 456 · Juillet 374 702 · Août 332 826

## 3. Saisie d'avril à août 2026

Création des dépenses pour les 5 mois, avec les salaires commerciaux suivants (base + commission calculée sur les factures payées) :

| Mois | Josphin | Richard | Donald |
|---|---|---|---|
| Avril | 126 150 | 165 065 | 139 700 |
| Mai | 163 306 | 53 000 | 50 000 |
| Juin | 191 500 | 50 000 | 98 000 |
| Juillet | 234 528 | 178 115 | 40 000 (aucune vente) |
| Août | 192 000 | 84 800 | 150 000 |

Statut par défaut : "Payé" pour les mois d'avril à août (déjà passés), date = fin de mois ; tu pourras ajuster individuellement.

## Détails techniques

- Nouvelle table `public.expense_templates` (description, amount, category_id, day_of_month, active_from, active_to, is_active) avec RLS : lecture admin/comptable, écriture admin, GRANT explicites.
- Nouveau composant `src/components/accounting/ExpenseTemplateSection.jsx` (gestion du modèle) + bouton d'application dans `ExpensesSection.jsx`.
- L'application du modèle passe par une insertion côté client filtrée sur `active_from`/`active_to` et sur les doublons existants du mois.
- Les commissions viennent de `src/utils/commissionCalculations.js` (aucun changement de logique) ; pour un mois futur, le bouton propose le montant calculé au moment du clic.
- Données avril→août insérées directement en base (opération de données, pas de changement de schéma).
