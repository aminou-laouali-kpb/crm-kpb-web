## Constat

J'ai testé la page `/auth` dans un navigateur réel :

- En local (aperçu) : la page s'affiche, aucune erreur console ni erreur runtime.
- En production (`crm.kpbeducation.cloud/auth`) : la page s'affiche aussi, mais dans une **version plus ancienne** — l'onglet « Inscription » présent dans le code n'y est pas.

Donc le code de la page n'est pas cassé. L'écran blanc que tu vois vient très probablement du **cache navigateur** : toutes les pages sont chargées en `lazy()` et enveloppées dans un simple `Suspense` sans filet de sécurité. Quand une nouvelle version est publiée, l'ancien `index.html` en cache demande un fichier JavaScript qui n'existe plus → le chargement échoue silencieusement et l'écran reste blanc, sans message.

Diagnostic à confirmer en premier : ouvrir la page en navigation privée ou faire un rechargement forcé. Si la page apparaît, c'est bien le cache.

## Ce qu'il faut construire

1. **Filet de sécurité au chargement des pages**
   Ajouter un composant d'erreur global autour des routes. S'il détecte un échec de chargement d'un module (message type « Failed to fetch dynamically imported module » / « Importing a module script failed »), il recharge automatiquement la page une seule fois (drapeau en `sessionStorage` pour éviter une boucle). Pour toute autre erreur, il affiche un écran lisible aux couleurs KPB avec un bouton « Recharger ».

2. **Fin de l'écran blanc silencieux**
   Le message de secours de `Suspense` reste, mais l'erreur n'est plus avalée : l'utilisateur voit soit la page rechargée, soit un message clair.

3. **Empêcher la réapparition du problème**
   Servir `index.html` sans mise en cache (`Cache-Control: no-cache`) via les en-têtes du build, pour que chaque visite récupère la liste à jour des fichiers JavaScript.

4. **Republier l'application**
   La version en ligne est en retard sur le code. Une republication est nécessaire pour que les correctifs récents (onglet Inscription, signature de contrat) soient réellement en ligne.

## Détails techniques

- Nouveau fichier `src/components/layout/RouteErrorBoundary.jsx` : `class` React avec `componentDidCatch`, détection des erreurs de chargement de chunk par expression régulière, `window.location.reload()` protégé par une clé `sessionStorage`.
- `src/App.jsx` : envelopper `<Suspense>` avec `<RouteErrorBoundary>`, à l'intérieur de `BrowserRouter`.
- En-têtes de cache : `no-cache` sur `index.html`, cache long conservé sur les fichiers hachés de `assets/`.
- Aucun changement de logique métier, d'authentification ou de base de données.

## Hors périmètre

Point séparé repéré au passage (à traiter seulement si tu le veux) : la fonction serveur `update-contract-client-info` n'est pas déclarée dans la configuration, donc la page publique de signature de contrat `/contrat/:token` échouera à l'enregistrement des informations client.
