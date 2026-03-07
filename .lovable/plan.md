

# Plan : Reduire la taille du PDF des rapports

## Cause du probleme

Ligne 290-291 : le PDF est genere avec `scale: 2` et l'image est exportee en PNG non compresse (`toDataURL('image/png', 1.0)`). Pour un rapport long avec beaucoup de sections, cela produit un canvas enorme converti en PNG pleine qualite, puis insere page par page dans le PDF (la meme image geante est ajoutee a chaque page).

## Solution

Trois optimisations cumulatives dans `exportToPDF` :

1. **Reduire le scale** de `2` a `1.5` (suffisant pour un rapport lisible)
2. **Utiliser JPEG au lieu de PNG** avec compression : `canvas.toDataURL('image/jpeg', 0.7)`
3. **Decouper le canvas par page** au lieu d'inserer l'image entiere a chaque appel `addImage`. Actuellement la meme image gigantesque est ajoutee N fois. On decoupera le canvas en tranches de hauteur de page et on inserera uniquement la tranche correspondante.
4. **Utiliser la compression FAST** de jsPDF : `pdf.addImage(..., 'JPEG', ..., 'FAST')`

### Code modifie (lignes 289-305)

```javascript
await new Promise(resolve => setTimeout(resolve, 500));
const canvas = await html2canvas(reportRef.current, {
  scale: 1.5,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  scrollY: -window.scrollY
});

const imgWidth = 210;
const pageHeight = 297;
const pxPerMm = canvas.width / imgWidth;
const pageHeightPx = Math.floor(pageHeight * pxPerMm);
const totalPages = Math.ceil(canvas.height / pageHeightPx);

const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

for (let i = 0; i < totalPages; i++) {
  if (i > 0) pdf.addPage();
  const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = canvas.width;
  pageCanvas.height = sliceHeight;
  const ctx = pageCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, i * pageHeightPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
  const pageImg = pageCanvas.toDataURL('image/jpeg', 0.75);
  const sliceHeightMm = (sliceHeight / canvas.width) * imgWidth;
  pdf.addImage(pageImg, 'JPEG', 0, 0, imgWidth, sliceHeightMm, undefined, 'FAST');
}
```

### Impact attendu
- Scale 2 → 1.5 : ~44% moins de pixels
- PNG → JPEG 0.75 : ~80% plus petit par image
- Decoupage par page : chaque page ne contient que sa tranche au lieu de l'image entiere
- Resultat estime : de >50MB a ~2-5MB

### Fichier a modifier
`src/pages/ReportsPage.jsx` (lignes 289-305 uniquement)

