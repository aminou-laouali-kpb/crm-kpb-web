import { supabase } from '@/integrations/supabase/client';

/**
 * Preview the next global invoice number (does not consume the sequence).
 * Format: KPB-YYYY-NNNN — same suite for every commercial.
 */
export const peekNextInvoiceNumber = async () => {
  const year = new Date().getFullYear();

  const { data, error } = await supabase.rpc('peek_next_invoice_number', {
    p_year: year,
  });
  if (!error && data) return data;

  // Fallback estimate only for UI; the server trigger assigns the real number.
  return `KPB-${year}-????`;
};

/**
 * @deprecated Prefer server-side assignment via INSERT trigger.
 * Kept for rare admin/scripts; still uses the global RPC when available.
 */
export const generateSequentialInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const { data, error } = await supabase.rpc('get_next_invoice_number', {
    p_year: year,
  });
  if (!error && data) return data;

  // Do NOT invent a per-user number (RLS-scoped MAX caused non-uniform suites).
  throw new Error(
    'Numérotation globale indisponible. La migration de séquence doit être appliquée sur Supabase.'
  );
};

/** Placeholder until the server assigns the real number on insert */
export const PENDING_INVOICE_NUMBER = 'AUTO';

export const generateRandomInvoiceNumber = () => PENDING_INVOICE_NUMBER;

export const isDuplicateInvoiceNumberError = (error) => {
  const msg = error?.message || String(error || '');
  return /duplicate key|invoices_invoice_number_key|unique constraint/i.test(msg);
};
