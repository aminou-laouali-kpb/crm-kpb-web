/**
 * Extrait des articles du contrat rendu (markdown) : « ### Article N — … »
 * jusqu'à l'article suivant ou l'annexe. Sert à afficher la politique de
 * remboursement et de désistement dans un encadré dédié.
 */
export const extractArticles = (markdown, numbers) => {
  if (!markdown) return '';
  const lines = markdown.split('\n');
  const wanted = new Set(numbers.map(String));
  const out = [];
  let keep = false;

  for (const line of lines) {
    const article = line.match(/^###\s+Article\s+(\d+)\b/i);
    if (article) {
      keep = wanted.has(article[1]);
    } else if (/^#{1,2}\s/.test(line)) {
      keep = false;
    }
    if (keep) out.push(line);
  }
  return out.join('\n').trim();
};

/** Montant lisible (« 500 000 FCFA ») à partir du bon de commande figé dans le lien. */
export const formatEngagementAmount = (amount, devise) => {
  if (amount === null || amount === undefined || amount === '') return null;
  const symbol = { XOF: 'FCFA', EUR: '€', USD: '$' }[devise] || devise || 'FCFA';
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  return `${value.toLocaleString('fr-FR').replace(/\s/g, ' ')} ${symbol}`;
};
