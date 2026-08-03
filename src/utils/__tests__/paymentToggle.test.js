import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PAYMENT_OPTIONS } from '@/constants/paymentMethods';

/**
 * Mirror of PaymentTypeSection toggle rules for regression coverage
 * (Safari crash was tied to double-toggle / non-array selectedPayments).
 */
function togglePayment(current, paymentId) {
  const selected = Array.isArray(current) ? current : [];
  if (selected.includes(paymentId)) {
    if (selected.length <= 1) return { blocked: 'min', next: selected };
    return { blocked: null, next: selected.filter((p) => p !== paymentId) };
  }
  if (selected.length >= 3) return { blocked: 'max', next: selected };
  return { blocked: null, next: [...selected, paymentId] };
}

describe('payment toggle rules', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a second payment method', () => {
    expect(togglePayment(['USA'], 'France').next).toEqual(['USA', 'France']);
  });

  it('blocks removing the last payment', () => {
    expect(togglePayment(['USA'], 'USA').blocked).toBe('min');
  });

  it('blocks more than 3 payments', () => {
    expect(togglePayment(['USA', 'France', 'Wave'], 'BOA').blocked).toBe('max');
  });

  it('tolerates non-array current selection', () => {
    expect(togglePayment(null, 'France').next).toEqual(['France']);
  });

  it('exposes the expected payment catalog', () => {
    expect(PAYMENT_OPTIONS.length).toBeGreaterThanOrEqual(5);
    expect(PAYMENT_OPTIONS.some((p) => p.id === 'USA')).toBe(true);
    expect(PAYMENT_OPTIONS.some((p) => p.id === 'Maroc')).toBe(true);
  });
});
