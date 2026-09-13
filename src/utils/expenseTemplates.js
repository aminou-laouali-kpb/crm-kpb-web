import { supabase } from '@/integrations/supabase/client';
import { calculateLeaderboardData } from '@/utils/commissionCalculations';

/** Dernier jour du mois */
const lastDay = (year, month) => new Date(year, month, 0).getDate();

/** Vérifie si un modèle s'applique au mois/année donné */
export const isTemplateApplicable = (tpl, month, year) => {
  if (!tpl.is_active) return false;
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  if (tpl.active_from && new Date(tpl.active_from) > last) return false;
  if (tpl.active_to && new Date(tpl.active_to) < first) return false;
  if (Array.isArray(tpl.months_pattern) && tpl.months_pattern.length > 0) {
    if (!tpl.months_pattern.includes(month)) return false;
  }
  return true;
};

/** Récupère les commissions du mois par commercial (même logique que le classement) */
export const getMonthlyCommissions = async (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const { data, error } = await supabase.rpc('get_invoice_stats', {
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
  });
  if (error) throw error;

  const leaderboard = calculateLeaderboardData(data || [], { startDate, endDate });
  const map = {};
  leaderboard.forEach((rep) => {
    map[rep.name] = Math.round(rep.commission?.totalCommission || 0);
  });
  return map;
};

/**
 * Construit l'aperçu des dépenses à créer pour un mois donné.
 * Retourne { items, skipped }
 */
export const buildMonthlyPreview = async (templates, month, year, existingExpenses = []) => {
  const commissions = await getMonthlyCommissions(month, year);
  const existing = new Set(
    existingExpenses.map((e) => (e.description || '').trim().toLowerCase())
  );

  const items = [];
  const skipped = [];

  templates
    .filter((tpl) => isTemplateApplicable(tpl, month, year))
    .forEach((tpl) => {
      const repMatch = /^salaire\s+(.+)$/i.exec(tpl.description.trim());
      const repName = repMatch ? repMatch[1].trim() : null;
      const commission = repName && commissions[repName] != null ? commissions[repName] : 0;
      const amount = Number(tpl.amount) + commission;

      const day = Math.min(Math.max(tpl.day_of_month || 1, 1), lastDay(year, month));
      const expense_date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const row = {
        template_id: tpl.id,
        description: tpl.description,
        amount,
        base_amount: Number(tpl.amount),
        commission,
        category_id: tpl.category_id || null,
        expense_date,
        status: 'pending',
        notes: tpl.notes || null,
      };

      if (existing.has(tpl.description.trim().toLowerCase())) {
        skipped.push(row);
      } else {
        items.push(row);
      }
    });

  return { items, skipped };
};

/** Insère les dépenses générées depuis le modèle */
export const applyMonthlyTemplate = async (items) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const rows = items.map((i) => ({
    description: i.description,
    amount: i.amount,
    category_id: i.category_id,
    expense_date: i.expense_date,
    status: i.status || 'pending',
    notes: i.notes,
    admin_id: user.id,
  }));

  const { error } = await supabase.from('expenses').insert(rows);
  if (error) throw error;
  return rows.length;
};
