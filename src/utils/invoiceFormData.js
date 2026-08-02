/**
 * Rebuild the TemplatePage formData shape from a CRM invoice row.
 * Allows commercials to re-open / re-download any existing invoice.
 */
export function invoiceToFormData(invoice) {
  if (!invoice) return null;

  const paymentTypes = String(invoice.payment_type || 'USA')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    clientInfo: {
      firstName: invoice.client_first_name || '',
      lastName: invoice.client_last_name || '',
      email: invoice.client_email || '',
      whatsapp: invoice.client_whatsapp || '',
    },
    invoice: {
      number: invoice.invoice_number || '',
      date: invoice.invoice_date || '',
    },
    service: invoice.service_description || '',
    paymentInfo: { types: paymentTypes.length ? paymentTypes : ['USA'] },
    selectedPayments: paymentTypes.length ? paymentTypes : ['USA'],
    salesRep: invoice.sales_representative || '',
    grandTotal: Number(invoice.amount) || 0,
    selectedCurrency: invoice.currency || 'XOF',
  };
}
