import React from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';

const Leaderboard = ({ invoices, periodLabel }) => {
  // Calculate leaderboard data from paid invoices only
  const getLeaderboardData = () => {
    const salesReps = ['Josphin', 'Nadia', 'Donald', 'Richard'];
    const leaderboardData = [];

    salesReps.forEach(rep => {
      const repInvoices = invoices.filter(
        inv => inv.sales_representative === rep && inv.status === 'paid'
      );
      const totalSales = repInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const salesCount = repInvoices.length;

      leaderboardData.push({
        name: rep,
        totalSales,
        salesCount,
        initial: rep.charAt(0)
      });
    });

    // Sort by total sales descending
    return leaderboardData.sort((a, b) => b.totalSales - a.totalSales);
  };

  const leaderboardData = getLeaderboardData();

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
        return 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-yellow-400/50 animate-pulse';
      case 1:
        return 'bg-gradient-to-br from-gray-300 to-slate-400';
      case 2:
        return 'bg-gradient-to-br from-amber-500 to-orange-600';
      default:
        return 'bg-gradient-primary';
    }
  };

  return (
    <div className="glass p-4 md:p-6 rounded-xl shadow-lg mb-6 md:mb-8 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
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

      <div className="space-y-2">
        {leaderboardData.map((rep, index) => (
          <div
            key={rep.name}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 hover:scale-[1.01] ${getRankStyle(index)}`}
            style={{ animationDelay: `${index * 0.1}s` }}
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
              <p className={`font-semibold truncate ${index === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                {rep.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {rep.salesCount} vente{rep.salesCount > 1 ? 's' : ''} payée{rep.salesCount > 1 ? 's' : ''}
              </p>
            </div>

            {/* Total Sales */}
            <div className="text-right flex-shrink-0">
              <p className={`font-bold ${index === 0 ? 'text-lg text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                {formatCurrency(rep.totalSales, 'XOF')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {leaderboardData.every(rep => rep.totalSales === 0) && (
        <p className="text-center text-muted-foreground py-4">
          Aucune vente payée ce mois-ci
        </p>
      )}
    </div>
  );
};

export default Leaderboard;
