# Suivi des tranches de paiement

## Objectif
Aucun étudiant ayant payé une 1re tranche ne doit être oublié : chaque solde restant a une date de relance, le commercial est rappelé, et l'admin contrôle.

## Ce qui change pour les commerciaux
1. **Quand ils marquent une facture « payée »** (fenêtre existante du reçu) : nouvelle question « Paiement partiel (tranche) ? ». Si oui : montant total du service, montant restant, et **date prévue du prochain paiement** (obligatoire).
2. **Nouvelle page « Relances tranches »** : liste de leurs échéances, triées par urgence :
   - En retard (rouge), aujourd'hui (orange), à venir (gris).
   - Nom, service, montant restant, date prévue, bouton **WhatsApp** avec message pré-rempli de rappel.
   - Boutons : « Relance faite » (repousse la date + commentaire), « Solde payé » (lie la nouvelle facture et clôt l'échéance), « Abandon » (motif obligatoire).
3. **Badge dans le menu** avec le nombre de relances du jour/en retard, et une alerte à la connexion s'il y en a.
4. **Email chaque matin** (8h Niamey) à chaque commercial avec ses relances du jour et en retard.

## Ce que voit l'admin
Tableau par commercial : nombre de tranches en attente, en retard, montant total restant à encaisser, relances effectuées ce mois. Clic pour voir le détail.

## Reprise de l'existant
Les clients déjà identifiés (1re tranche sans 2e) seront importés comme échéances en retard, attribués à leur commercial, pour démarrer avec une liste à jour.

## Détails techniques
- Table `payment_installments` (invoice_id, client_id, sales_rep, total_amount, remaining_amount, due_date, status pending/paid/abandoned, last_reminder_at, reminder_count, notes) + table `installment_reminders` (historique court). GRANT + RLS : commercial = ses lignes, admin/comptable = tout.
- Création via le dialogue « payée » de `CRMPage.jsx` (Zod).
- Nouvelle page `InstallmentsPage.jsx`, route `/relances`, entrée menu avec badge dans `AppLayout.jsx`.
- Email quotidien : nécessite de configurer un domaine d'envoi d'emails (étape guidée), puis une fonction serveur déclenchée une fois par jour.
- Import initial via SQL à partir de la logique déjà utilisée pour l'export Excel.
