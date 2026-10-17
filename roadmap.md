# Roadmap

- [ ] Appliquer et vérifier 0006_prerequis_et_roles → 0007_fondations_securite → 0008_dossiers → 0009_contrats — bloqué : 0006 et 0008 créent des références à auth.users hors profiles/user_roles ; les GRANT des nouvelles tables doivent précéder RLS et les politiques ; fichiers compatibles nécessaires pour une application byte-for-byte
- [ ] Exécuter une fois drizzle/donnees/donnees_initiales.sql — bloqué : attend l’application des quatre migrations
- [x] Déployer admin-users et sign-contract
- [x] Suivi des tranches : table, saisie à la facture payée, page Relances, badge + alerte, tableau admin, import existant
- [ ] Email quotidien aux commerciaux — bloqué : domaine d'envoi d'emails à configurer par l'utilisateur
