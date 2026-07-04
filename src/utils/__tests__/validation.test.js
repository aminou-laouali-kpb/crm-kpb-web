import { describe, it, expect } from 'vitest';
import { validateInvoiceData } from '../validation';
import { invoiceMatchesPaymentFilter, parsePaymentTypes } from '@/constants/paymentMethods';

describe('validation', () => {
  it('validates correct invoice data', () => {
    const result = validateInvoiceData({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      whatsapp: '+33612345678',
      service: 'Formation web',
      amount: 1500,
      invoiceNumber: 'KPB-2026-0001',
      invoiceDate: '2026-06-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = validateInvoiceData({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'invalid-email',
      whatsapp: '+33612345678',
      service: 'Formation',
      amount: 1500,
      invoiceNumber: '001',
      invoiceDate: '2026-06-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero amount', () => {
    const result = validateInvoiceData({
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean@example.com',
      whatsapp: '+33612345678',
      service: 'Formation',
      amount: 0,
      invoiceNumber: '001',
      invoiceDate: '2026-06-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('payment filter', () => {
  it('parses comma-separated payment types', () => {
    expect(parsePaymentTypes('USA,France')).toEqual(['USA', 'France']);
  });

  it('matches multi-payment invoices', () => {
    expect(invoiceMatchesPaymentFilter('USA,France', 'France')).toBe(true);
    expect(invoiceMatchesPaymentFilter('USA', 'France')).toBe(false);
    expect(invoiceMatchesPaymentFilter('USA,France', 'all')).toBe(true);
  });
});
