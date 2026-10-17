/** États du contrat d'une facture (fonction SQL invoice_contract_state). */
export const CONTRACT_STATES = {
  signe: { label: 'Contrat signé', short: 'Signé', className: 'bg-emerald-100 text-emerald-800' },
  ouvert: { label: 'Ouvert, non signé', short: 'Ouvert', className: 'bg-sky-100 text-sky-800' },
  envoye: { label: 'Envoyé, en attente', short: 'Envoyé', className: 'bg-amber-100 text-amber-800' },
  expire: { label: 'Lien expiré', short: 'Expiré', className: 'bg-red-100 text-red-800' },
  non_envoye: { label: 'Contrat non envoyé', short: 'Non envoyé', className: 'bg-slate-100 text-slate-700' },
};

export const getContractState = (state) => CONTRACT_STATES[state] || CONTRACT_STATES.non_envoye;

export const contractUrl = (token, origin = window.location.origin) => `${origin}/contrat/${token}`;

/** Message WhatsApp d'envoi (ou de relance) du lien de signature. */
export const buildContractMessage = ({ firstName, url, reminder = false }) => {
  const hello = `Bonjour${firstName ? ` ${firstName}` : ''},\n\n`;
  const body = reminder
    ? `Petit rappel : votre contrat KPB Education n’est pas encore signé. ` +
      `Il ne prend que 2 minutes à lire et signer en ligne :\n${url}\n\n`
    : `Voici votre contrat d’accompagnement KPB Education à lire et signer en ligne ` +
      `(environ 2 minutes, depuis votre téléphone) :\n${url}\n\n` +
      `Prenez le temps de lire la partie « Remboursement et désistement ».\n\n`;
  return `${hello}${body}Le lien est personnel et valable 30 jours.\n\nKPB Education`;
};

/** Contrats à relancer : non signés, du plus ancien envoi au plus récent. */
export const contractsToFollowUp = (rows) =>
  rows
    .filter((r) => r.contract_state !== 'signe')
    .sort((a, b) => String(a.sent_at || a.invoice_created_at).localeCompare(String(b.sent_at || b.invoice_created_at)));

/** Jours depuis l'envoi (ou la dernière relance). */
export const daysSinceLastTouch = (row, now = new Date()) => {
  const last = row.last_reminded_at || row.sent_at;
  if (!last) return null;
  return Math.floor((now.getTime() - new Date(last).getTime()) / 86400000);
};
