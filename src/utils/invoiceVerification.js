// Base publique utilisée pour la vérification des factures (scannable hors de l'app)
export const VERIFICATION_BASE_URL = 'https://crm.kpbeducation.cloud';

export const VERIFICATION_PATH = '/verifier-facture';

export const buildVerificationUrl = (invoiceNumber) => {
  const num = (invoiceNumber || '').trim();
  const base =
    typeof window !== 'undefined' && window.location?.origin?.includes('kpbeducation')
      ? window.location.origin
      : VERIFICATION_BASE_URL;
  return `${base}${VERIFICATION_PATH}?n=${encodeURIComponent(num)}`;
};
