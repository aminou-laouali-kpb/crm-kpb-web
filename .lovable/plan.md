## Problème

Sur iPhone (Safari), après avoir choisi un modèle sur la page générateur, rien ne se passe : ni erreur, ni navigation vers l'aperçu.

Ce que j'ai vérifié : en base, seules 3 factures ont été créées depuis janvier 2026 (dernière le 2 août), donc l'insertion ne se déclenche pas ou échoue sans retour visible. Le diagnostic exact n'est pas encore confirmé — la première étape du plan est de le confirmer.

## Hypothèses à confirmer

1. **La carte "modèle" est une `<div>` avec `onClick`.** Safari iOS ne déclenche pas toujours l'événement `click` sur un élément non interactif (pas de `<button>`, pas de `tabindex`), surtout quand un clavier virtuel vient de se fermer. Le tap serait donc simplement ignoré.
2. **Le formulaire est considéré incomplet** (numéro de facture non généré, montant mal parsé) — dans ce cas un toast d'erreur devrait apparaître, mais les toasts peuvent être masqués/hors écran sur mobile.
3. **Blocage à l'initialisation** : la génération du numéro séquentiel est asynchrone ; si elle reste bloquée, le formulaire reste sans numéro et le bouton reste inactif.

## Étapes

1. **Reproduire** en émulation iPhone Safari sur l'aperçu : remplir le formulaire, taper une carte modèle, capturer console + réseau pour identifier laquelle des 3 hypothèses s'applique.
2. **Rendre les cartes réellement cliquables** : transformer chaque carte modèle en `<button type="button">` avec `disabled` géré proprement (au lieu d'une `div` + `aria-disabled`). Cela supprime d'office le problème de tap iOS et donne le retour visuel natif.
3. **Rendre les erreurs visibles sur mobile** : afficher le message d'échec directement dans la zone "Formulaire incomplet" (bloc ambre déjà présent) en plus du toast, et positionner les toasts en haut sur mobile pour qu'ils ne soient pas cachés par la barre Safari.
4. **Fiabiliser le numéro de facture** : si la génération asynchrone n'a pas abouti au moment du tap, la générer à la volée dans le handler avant l'insertion, au lieu de bloquer le formulaire.
5. **Re-tester** en émulation mobile jusqu'à obtenir une facture créée et la navigation vers `/template`.

## Détails techniques

- Fichiers concernés : `src/pages/Index.jsx` (cartes modèles, handler `handleTemplateClick`, hydratation du numéro), éventuellement `src/main.jsx`/`App.jsx` pour la position du `<Toaster />`.
- Aucun changement de logique métier, de schéma base de données ni du contenu des factures.
- Le PDF (`src/utils/pdfGenerator.js`) n'est pas touché à cette étape : le blocage signalé se produit avant l'aperçu.
