import { supabase } from '@/integrations/supabase/client';

/**
 * Generate the next sequential invoice number for the current year.
 * Format: KPB-YYYY-NNNN
 */
export const generateSequentialInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `KPB-${year}-`;

  try {
    const { data, error } = await supabase.rpc('get_next_invoice_number', {
      p_year: year,
    });
    if (!error && data) return data;
  } catch {
    // fallback below
  }

  // Client-side fallback if RPC unavailable
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${prefix}%`);

  const next = ((count || 0) + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
};

/** Legacy random number generator — kept for dev/test */
export const generateRandomInvoiceNumber = () => {
  const length = Math.floor(Math.random() * 6) + 3;
  const alphabetCount = Math.min(Math.floor(Math.random() * 4), length);
  let result = '';
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';

  for (let i = 0; i < alphabetCount; i++) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  for (let i = alphabetCount; i < length; i++) {
    result += numbers[Math.floor(Math.random() * numbers.length)];
  }
  return result;
};
