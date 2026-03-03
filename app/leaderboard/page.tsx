'use client';

import { useState, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Trophy, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  name: string;
  cash: number;
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  created_at: number;
}

export default function LeaderboardPage() {
  const { portfolioId } = usePortfolio();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/leaderboard');
      const data = await resp.json();
      if (Array.isArray(data)) setEntries(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Leaderboard
        </h1>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="card">
        <p className="text-sm text-gray-500 mb-4">
          Note: Portfolio values shown use cost basis for held assets. Live prices are fetched on the Dashboard.
        </p>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading leaderboard...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No portfolios yet. Be the first!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 text-gray-400 font-medium w-12">Rank</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Trader</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Portfolio Value</th>
                  <th className="text-right py-2 text-gray-400 font-medium hidden md:table-cell">Cash</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Total Return</th>
                  <th className="text-right py-2 text-gray-400 font-medium hidden md:table-cell">Return %</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-gray-800/50 transition-colors ${
                      entry.id === portfolioId
                        ? 'bg-green-500/5 hover:bg-green-500/10'
                        : 'hover:bg-gray-800/20'
                    }`}
                  >
                    <td className="py-3">
                      {i < 3 ? (
                        <span className="text-lg">{MEDALS[i]}</span>
                      ) : (
                        <span className="text-gray-500 font-medium">{i + 1}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-white">{entry.name}</span>
                      {entry.id === portfolioId && (
                        <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right text-white font-medium">
                      {formatCurrency(entry.totalValue)}
                    </td>
                    <td className="py-3 text-right text-gray-400 hidden md:table-cell">
                      {formatCurrency(entry.cash)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`font-semibold ${
                          entry.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {entry.totalReturn >= 0 ? '+' : ''}
                        {formatCurrency(entry.totalReturn)}
                      </span>
                    </td>
                    <td className="py-3 text-right hidden md:table-cell">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          entry.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {entry.totalReturnPercent >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{formatPercent(entry.totalReturnPercent)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
