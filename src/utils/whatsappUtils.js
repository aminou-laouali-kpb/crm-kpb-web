/**
 * Build a WhatsApp deep link for contacting a client.
 * @param {string} phone - Phone number with country code (e.g. +33612345678)
 * @param {string} message - Pre-filled message
 */
export const buildWhatsAppLink = (phone, message = '') => {
  const cleaned = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}${encoded ? `?text=${encoded}` : ''}`;
};

export const buildInvoiceWhatsAppMessage = (invoice) => {
  const name = `${invoice.client_first_name} ${invoice.client_last_name}`.trim();
  return (
    `Bonjour ${name},\n\n` +
    `Concernant votre facture n°${invoice.invoice_number} ` +
    `d'un montant de ${invoice.amount} ${invoice.currency || 'XOF'}.\n\n` +
    `Merci de nous indiquer si vous avez des questions.\n\n` +
    `Cordialement,\nKPB Education`
  );
};

export const buildInvoiceSentMessage = (invoice) => {
  const name = `${invoice.client_first_name} ${invoice.client_last_name}`.trim();
  return (
    `Bonjour ${name},\n\n` +
    `Votre facture n°${invoice.invoice_number} KPB Education vous a été envoyée.\n` +
    `Montant : ${invoice.amount} ${invoice.currency || 'XOF'}.\n\n` +
    `Merci de procéder au paiement selon les instructions indiquées sur la facture.\n\n` +
    `Cordialement,\nKPB Education`
  );
};
