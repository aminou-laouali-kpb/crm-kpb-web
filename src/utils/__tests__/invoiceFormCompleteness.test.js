import { describe, it, expect } from 'vitest';
import { getMissingInvoiceFields, parseAmountInput } from '../invoiceFormCompleteness';

describe('parseAmountInput', () => {
  it('parses plain numbers and european formats', () => {
    expect(parseAmountInput(1500)).toBe(1500);
    expect(parseAmountInput('1500')).toBe(1500);
    expect(parseAmountInput('1 500')).toBe(1500);
    expect(parseAmountInput('1500,50')).toBe(1500.5);
    expect(parseAmountInput('1.500,50')).toBe(1500.5);
  });
});

describe('getMissingInvoiceFields', () => {
  const complete = {
    clientInfo: {
      firstName: 'Amina',
      lastName: 'Diallo',
      email: 'a@b.com',
      whatsapp: '+22790000000',
    },
    invoice: { number: 'KPB-1', date: '2026-08-02' },
    service: 'Accompagnement',
    salesRep: 'Nadia',
    grandTotal: 1000,
  };

  it('returns empty list when form is complete', () => {
    expect(getMissingInvoiceFields(complete)).toEqual([]);
  });

  it('lists missing commercial and date', () => {
    const missing = getMissingInvoiceFields({
      ...complete,
      salesRep: '',
      invoice: { ...complete.invoice, date: '' },
    });
    expect(missing).toContain('Commercial');
    expect(missing).toContain('Date de la facture');
  });

  it('does not require invoice number (server assigns globally)', () => {
    const missing = getMissingInvoiceFields({
      ...complete,
      invoice: { number: '', date: '2026-08-02' },
    });
    expect(missing).not.toContain('Numéro de facture');
  });
});
