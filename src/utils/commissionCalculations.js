import { DEFAULT_SALES_REP_NAMES } from '@/constants/salesReps';

/**
 * Configuration des commissions et points pour les commerciaux
 */
export const COMMISSION_CONFIG = {
  MAKETOU_FEE_RATE: 0.05,        // 5% de frais Maketou
  BASE_COMMISSION_RATE: 0.10,    // 10% de commission de base
  TIER_THRESHOLD: 850000,        // Seuil pour le bonus palier (850k FCFA)
  TIER_BONUS: 10000,             // Bonus palier +10k FCFA
  TOP_SELLER_BONUS: 15000,       // Bonus meilleur vendeur +15k FCFA
  POINTS_BY_POSITION: [10, 5, 3, 0]  // Points par position (1er, 2ème, 3ème, 4ème+)
};

/**
 * Calcule le montant net après déduction des frais Maketou (5%)
 * @param {number} amount - Montant brut de la facture
 * @param {string} paymentType - Type de paiement (peut contenir "Maketou")
 * @returns {number} Montant net reçu
 */
export const getNetAmount = (amount, paymentType) => {
  if (paymentType && paymentType.includes('Maketou')) {
    return amount * (1 - COMMISSION_CONFIG.MAKETOU_FEE_RATE);
  }
  return amount;
};

/**
 * Calcule les commissions détaillées pour un commercial
 * @param {number} netSales - Total des ventes nettes (après frais Maketou)
 * @param {boolean} isTopSeller - Si ce commercial est le meilleur vendeur du mois
 * @returns {object} Détail des commissions
 */
export const calculateCommission = (netSales, isTopSeller = false) => {
  // Commission de base : 10%
  const baseCommission = netSales * COMMISSION_CONFIG.BASE_COMMISSION_RATE;
  
  // Bonus palier : +10k si >= 850k
  const tierBonus = netSales >= COMMISSION_CONFIG.TIER_THRESHOLD ? COMMISSION_CONFIG.TIER_BONUS : 0;
  
  // Bonus meilleur vendeur : +15k
  const topSellerBonus = isTopSeller ? COMMISSION_CONFIG.TOP_SELLER_BONUS : 0;
  
  // Total
  const totalCommission = baseCommission + tierBonus + topSellerBonus;
  
  return {
    baseCommission,
    tierBonus,
    topSellerBonus,
    totalCommission
  };
};

/**
 * Calcule les points du mois selon la position au classement
 * @param {number} position - Position au classement (0-indexé: 0 = 1er, 1 = 2ème, etc.)
 * @returns {number} Nombre de points
 */
export const getMonthlyPoints = (position) => {
  if (position >= 0 && position < COMMISSION_CONFIG.POINTS_BY_POSITION.length) {
    return COMMISSION_CONFIG.POINTS_BY_POSITION[position];
  }
  return 0;
};

/**
 * Calcule les dates de début et fin du trimestre courant
 * @param {number} month - Mois courant (1-12)
 * @param {number} year - Année courante
 * @returns {object} { startMonth, endMonth, quarter }
 */
export const getQuarterInfo = (month, year) => {
  const quarter = Math.floor((month - 1) / 3);
  const startMonth = quarter * 3 + 1;
  const endMonth = startMonth + 2;
  
  return {
    quarter: quarter + 1, // 1-4
    startMonth,
    endMonth,
    label: `T${quarter + 1} ${year}`
  };
};

/**
 * Calcule les données complètes du leaderboard avec commissions et points
 * @param {Array} invoices - Liste des factures
 * @param {object} periodDates - { startDate, endDate }
 * @param {Array} pointsHistory - Historique des points (optionnel, pour les points trimestriels)
 * @returns {Array} Données du leaderboard triées par ventes
 */
export const calculateLeaderboardData = (invoices, periodDates, pointsHistory = [], salesReps = DEFAULT_SALES_REP_NAMES) => {
  const { startDate, endDate } = periodDates;
  
  // Calculer les données pour chaque commercial
  const leaderboardData = salesReps.map(rep => {
    // Filtrer les factures payées dans la période (basé sur last_status_change)
    const repInvoices = invoices.filter(inv => {
      if (inv.sales_representative !== rep || inv.status !== 'paid') return false;
      if (!inv.last_status_change) return false;
      const paymentDate = new Date(inv.last_status_change);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    // Calcul des ventes brutes et nettes
    let grossSales = 0;
    let netSales = 0;
    
    repInvoices.forEach(inv => {
      const amount = parseFloat(inv.amount);
      grossSales += amount;
      netSales += getNetAmount(amount, inv.payment_type);
    });
    
    return {
      name: rep,
      initial: rep.charAt(0),
      salesCount: repInvoices.length,
      grossSales,
      netSales,
      // Les commissions et points seront calculés après le tri
      commission: null,
      monthlyPoints: 0,
      quarterlyPoints: 0
    };
  });
  
  // Trier par ventes nettes décroissantes
  leaderboardData.sort((a, b) => b.netSales - a.netSales);
  
  // Calculer les commissions et points selon la position
  leaderboardData.forEach((rep, index) => {
    const isTopSeller = index === 0 && rep.netSales > 0;
    rep.commission = calculateCommission(rep.netSales, isTopSeller);
    rep.monthlyPoints = rep.netSales > 0 ? getMonthlyPoints(index) : 0;
    rep.position = index + 1;
    
    // Calculer les points trimestriels depuis l'historique
    if (pointsHistory && pointsHistory.length > 0) {
      const month = startDate.getMonth() + 1;
      const year = startDate.getFullYear();
      const quarterInfo = getQuarterInfo(month, year);
      
      rep.quarterlyPoints = pointsHistory
        .filter(p => 
          p.sales_rep === rep.name && 
          p.year === year && 
          p.month >= quarterInfo.startMonth && 
          p.month <= quarterInfo.endMonth
        )
        .reduce((sum, p) => sum + p.points, 0);
    }
  });
  
  return leaderboardData;
};
