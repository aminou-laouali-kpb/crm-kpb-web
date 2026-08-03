import { describe, it, expect } from 'vitest';

// Pure helper mirrored from invoiceNumber.js (avoids supabase/localStorage in unit tests)
const isDuplicateInvoiceNumberError = (error) => {
  const msg = error?.message || String(error || '');
  return /duplicate key|invoices_invoice_number_key|unique constraint/i.test(msg);
};

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
