'use client';

import { useState, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Trophy, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { LeaderboardEntry } from '@/lib/leaderboard-cache';

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  fetchedAt: number;
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function LeaderboardPage() {
  const { portfolioId } = usePortfolio();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchLeaderboard = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = forceRefresh ? '/api/leaderboard?refresh=true' : '/api/leaderboard';
      const resp = await fetch(url);
      const data: LeaderboardResponse = await resp.json();
      if (Array.isArray(data.data)) {
        setEntries(data.data);
        setFetchedAt(data.fetchedAt);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Update the "X ago" display every 30s using a simple re-render trigger
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-400" />
          Leaderboard
        </h1>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <span className="text-xs text-gray-500">
              Live prices · updated {timeAgo(fetchedAt)}
              <span className="text-gray-600"> (cache 15m)</span>
            </span>
          )}
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={loading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-600" />
            <p>Fetching live prices…</p>
          </div>
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
                  <th className="text-left py-2 text-gray-400 font-medium hidden sm:table-cell">Portfolio</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Value</th>
                  <th className="text-right py-2 text-gray-400 font-medium hidden md:table-cell">Cash</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Return</th>
                  <th className="text-right py-2 text-gray-400 font-medium hidden md:table-cell">Return %</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.portfolioId}
                    className={`border-b border-gray-800/50 transition-colors ${
                      entry.portfolioId === portfolioId
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
                      <span className="font-semibold text-white">{entry.username}</span>
                      {entry.portfolioId === portfolioId && (
                        <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-400 hidden sm:table-cell text-xs">
                      {entry.portfolioName}
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
                          entry.totalReturnPct >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {entry.totalReturnPct >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{formatPercent(entry.totalReturnPct)}</span>
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
