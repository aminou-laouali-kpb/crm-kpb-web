/**
 * Shared helpers for the invoice generator form completeness checks.
 */

export const todayISODate = () => new Date().toISOString().split('T')[0];

/** Parse amounts typed by commercials (spaces, comma decimals, etc.) */
export const parseAmountInput = (raw) => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (raw == null) return 0;
  let text = String(raw).trim();
  if (!text) return 0;
  // Keep digits, separators, minus
  text = text.replace(/[^\d,.-]/g, '');
  // If both comma and dot: assume European "1.234,56" or "1,234.56"
  if (text.includes(',') && text.includes('.')) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : 0;
};

export const getMissingInvoiceFields = ({
  clientInfo = {},
  invoice = {},
  service = '',
  salesRep = '',
  grandTotal = 0,
}) => {
  const missing = [];
  if (!String(clientInfo.firstName || '').trim()) missing.push('Prénom du client');
  if (!String(clientInfo.lastName || '').trim()) missing.push('Nom du client');
  if (!String(clientInfo.email || '').trim()) missing.push('Email du client');
  if (!String(clientInfo.whatsapp || '').trim()) missing.push('WhatsApp du client');
  // Invoice number is assigned server-side (global sequence) — preview is optional
  if (!String(invoice.date || '').trim()) missing.push('Date de la facture');
  if (!String(service || '').trim()) missing.push('Description du service');
  if (!(parseAmountInput(grandTotal) > 0)) missing.push('Montant total');
  if (!String(salesRep || '').trim()) missing.push('Commercial');
  return missing;
};
