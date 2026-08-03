import { supabase } from '@/integrations/supabase/client';

const yearPrefix = (year = new Date().getFullYear()) => `KPB-${year}-`;

const parseSequentialSuffix = (invoiceNumber, year) => {
  const match = String(invoiceNumber || '').match(
    new RegExp(`^KPB-${year}-(\\d+)$`)
  );
  return match ? Number.parseInt(match[1], 10) : 0;
};

/**
 * Allocate the next unique sequential invoice number for the current year.
 * Format: KPB-YYYY-NNNN
 * Prefers the atomic DB RPC; falls back to MAX(existing)+1 when RPC is missing.
 */
export const generateSequentialInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = yearPrefix(year);

  try {
    const { data, error } = await supabase.rpc('get_next_invoice_number', {
      p_year: year,
    });
    if (!error && data) return data;
  } catch {
    // fallback below
  }

  // Fallback without RPC: take the highest visible KPB-YYYY-NNNN and +1.
  // Note: under RLS this may only see the current user's invoices — RPC is preferred.
  const { data: rows } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .limit(1000);

  let maxSuffix = 0;
  for (const row of rows || []) {
    maxSuffix = Math.max(maxSuffix, parseSequentialSuffix(row.invoice_number, year));
  }

  const next = (maxSuffix + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
};

/** Legacy random number generator — kept for extreme fallback only */
export const generateRandomInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString().slice(-6);
  return `KPB-${year}-R${suffix}`;
};

export const isDuplicateInvoiceNumberError = (error) => {
  const msg = error?.message || String(error || '');
  return /duplicate key|invoices_invoice_number_key|unique constraint/i.test(msg);
};
