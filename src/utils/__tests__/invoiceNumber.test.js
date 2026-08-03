import { describe, it, expect } from 'vitest';
import { isDuplicateInvoiceNumberError } from '../invoiceNumber';

describe('isDuplicateInvoiceNumberError', () => {
  it('detects postgres unique violations on invoice_number', () => {
    expect(
      isDuplicateInvoiceNumberError({
        message: 'duplicate key value violates unique constraint "invoices_invoice_number_key"',
      })
    ).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isDuplicateInvoiceNumberError({ message: 'Accès refusé' })).toBe(false);
  });
});
