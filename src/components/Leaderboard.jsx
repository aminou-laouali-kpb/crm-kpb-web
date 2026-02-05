import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, TrendingUp, Coins, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { 
  calculateLeaderboardData, 
  getQuarterInfo,
  COMMISSION_CONFIG
} from '../utils/commissionCalculations';
import { supabase } from '@/integrations/supabase/client';

const Leaderboard = ({ invoices, periodLabel, periodDates }) => {
  const [pointsHistory, setPointsHistory] = useState([]);
  const [expandedRep, setExpandedRep] = useState(null);

  // Charger l'historique des points pour le calcul trimestriel
  useEffect(() => {
    const fetchPointsHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('sales_rep_points')
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false });
        
        if (error) throw error;
        setPointsHistory(data || []);
      } catch (error) {
        console.error('Error fetching points history:', error);
      }
    };

    fetchPointsHistory();
  }, []);

  // Calculer les données du leaderboard avec commissions et points
  const leaderboardData = calculateLeaderboardData(invoices, periodDates, pointsHistory);

  // Informations sur le trimestre courant
  const currentMonth = periodDates.startDate.getMonth() + 1;
  const currentYear = periodDates.startDate.getFullYear();
  const quarterInfo = getQuarterInfo(currentMonth, currentYear);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 0:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold">{rank + 1}</span>;
    }
  };

  const getRankStyle = (rank) => {
    switch (rank) {
      case 0:
        return 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50 shadow-yellow-500/20';
      case 1:
        return 'bg-gradient-to-r from-gray-400/10 to-slate-400/10 border-gray-400/30';
      case 2:
        return 'bg-gradient-to-r from-amber-600/10 to-orange-600/10 border-amber-600/30';
      default:
        return 'bg-muted/30 border-border';
    }
  };

  const getAvatarStyle = (rank) => {
    switch (rank) {
      case 0:
        return 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-400/50';
      case 1:
        return 'bg-gradient-to-br from-gray-300 to-slate-400';
      case 2:
        return 'bg-gradient-to-br from-amber-500 to-orange-600';
      default:
        return 'bg-gradient-primary';
    }
  };

  const toggleExpand = (repName) => {
    setExpandedRep(expandedRep === repName ? null : repName);
  };

  return (
    <div className="glass p-4 md:p-6 rounded-xl shadow-lg mb-6 md:mb-8 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Classement du mois
            </h2>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3" />
            <span>{quarterInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Légende des bonus */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
          🎯 Base: 10%
        </span>
        <span className="px-2 py-1 rounded-full bg-success/10 text-success">
          💎 ≥{(COMMISSION_CONFIG.TIER_THRESHOLD / 1000).toFixed(0)}k: +{(COMMISSION_CONFIG.TIER_BONUS / 1000).toFixed(0)}k
        </span>
        <span className="px-2 py-1 rounded-full bg-warning/10 text-warning">
          🏆 1er: +{(COMMISSION_CONFIG.TOP_SELLER_BONUS / 1000).toFixed(0)}k
        </span>
      </div>

      <div className="space-y-2">
        {leaderboardData.map((rep, index) => (
          <div
            key={rep.name}
            className={`rounded-lg border transition-all duration-300 overflow-hidden ${getRankStyle(index)}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Ligne principale - cliquable */}
            <div 
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => toggleExpand(rep.name)}
            >
              {/* Rank Icon */}
              <div className="flex-shrink-0 w-8 flex justify-center">
                {getRankIcon(index)}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${getAvatarStyle(index)}`}>
                {rep.initial}
              </div>

              {/* Name and Stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold truncate ${index === 0 && rep.netSales > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                    {rep.name}
                  </p>
                  {rep.monthlyPoints > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      +{rep.monthlyPoints} pts
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rep.salesCount} vente{rep.salesCount > 1 ? 's' : ''} • Net: {formatCurrency(rep.netSales, 'XOF')}
                </p>
              </div>

              {/* Total Commission & Expand Icon */}
              <div className="text-right flex items-center gap-2">
                <div>
                  <p className={`font-bold ${index === 0 && rep.netSales > 0 ? 'text-lg text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                    {formatCurrency(rep.commission?.totalCommission || 0, 'XOF')}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <Coins className="h-3 w-3" />
                    Commission
                  </p>
                </div>
                {expandedRep === rep.name ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Détails étendus */}
            {expandedRep === rep.name && (
              <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {/* Ventes brutes */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ventes brutes</p>
                    <p className="font-semibold">{formatCurrency(rep.grossSales, 'XOF')}</p>
                  </div>
                  
                  {/* Ventes nettes */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Net (après frais)
                      {rep.grossSales !== rep.netSales && (
                        <span className="text-warning ml-1">-5%</span>
                      )}
                    </p>
                    <p className="font-semibold text-primary">{formatCurrency(rep.netSales, 'XOF')}</p>
                  </div>
                  
                  {/* Détail commissions */}
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Détail commissions</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-primary/10">
                        Base: {formatCurrency(rep.commission?.baseCommission || 0, 'XOF')}
                      </span>
                      {rep.commission?.tierBonus > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-success/20 text-success">
                          +{formatCurrency(rep.commission.tierBonus, 'XOF')} (850k)
                        </span>
                      )}
                      {rep.commission?.topSellerBonus > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-warning/20 text-warning">
                          +{formatCurrency(rep.commission.topSellerBonus, 'XOF')} (1er)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        <strong>{rep.monthlyPoints}</strong> pts ce mois
                      </span>
                    </div>
                    {rep.quarterlyPoints > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="text-sm">
                          {rep.quarterlyPoints} pts ({quarterInfo.label})
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Position: #{rep.position}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {leaderboardData.every(rep => rep.netSales === 0) && (
        <p className="text-center text-muted-foreground py-4">
          Aucune vente payée ce mois-ci
        </p>
      )}

      {/* Total des commissions du mois */}
      {leaderboardData.some(rep => rep.netSales > 0) && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total commissions à verser</span>
            <span className="font-bold text-lg text-primary">
              {formatCurrency(
                leaderboardData.reduce((sum, rep) => sum + (rep.commission?.totalCommission || 0), 0),
                'XOF'
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
