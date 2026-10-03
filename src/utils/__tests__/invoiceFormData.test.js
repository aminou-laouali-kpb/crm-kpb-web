import { describe, it, expect } from 'vitest';
import { invoiceToFormData } from '../invoiceFormData';

describe('invoiceToFormData', () => {
  it('rebuilds template formData from a CRM invoice row', () => {
    const formData = invoiceToFormData({
      client_first_name: 'Amina',
      client_last_name: 'Diallo',
      client_email: 'amina@example.com',
      client_whatsapp: '+22790000000',
      invoice_number: 'KPB-2026-0012',
      invoice_date: '2026-08-02',
      service_description: 'Accompagnement',
      payment_type: 'USA,Wave',
      sales_representative: 'Nadia',
      amount: 250000,
      currency: 'XOF',
      template_number: 2,
    });

    expect(formData.clientInfo.firstName).toBe('Amina');
    expect(formData.invoice.number).toBe('KPB-2026-0012');
    expect(formData.paymentInfo.types).toEqual(['USA', 'Wave']);
    expect(formData.grandTotal).toBe(250000);
    expect(formData.salesRep).toBe('Nadia');
  });

  it('returns null for missing invoice', () => {
    expect(invoiceToFormData(null)).toBeNull();
  });
});
