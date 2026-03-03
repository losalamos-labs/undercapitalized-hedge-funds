'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import SetupModal from '@/components/SetupModal';
import Sparkline from '@/components/Sparkline';
import { formatCurrency, formatPercent } from '@/lib/format';
import { Holding, AssetType } from '@/lib/types';
import { TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HoldingWithPrice extends Holding {
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

export default function Dashboard() {
  const { portfolioId, portfolio, holdings, loading, refresh } = usePortfolio();
  const [enrichedHoldings, setEnrichedHoldings] = useState<HoldingWithPrice[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const router = useRouter();

  const enrichHoldings = useCallback(async () => {
    if (!portfolio || holdings.length === 0) {
      setTotalValue(portfolio?.cash || 0);
      setEnrichedHoldings([]);
      return;
    }
    setEnriching(true);
    const results = await Promise.allSettled(
      holdings.map((h) =>
        fetch(`/api/quote?symbol=${encodeURIComponent(h.symbol)}&type=${h.asset_type}`).then((r) => r.json())
      )
    );

    let holdingsValue = 0;
    const enriched: HoldingWithPrice[] = holdings.map((h, i) => {
      const result = results[i];
      const price =
        result.status === 'fulfilled' && result.value?.price ? result.value.price : h.avg_cost;
      const currentValue = h.quantity * price;
      holdingsValue += currentValue;
      const pnl = currentValue - h.quantity * h.avg_cost;
      const pnlPercent = h.avg_cost > 0 ? ((price - h.avg_cost) / h.avg_cost) * 100 : 0;
      return { ...h, currentPrice: price, currentValue, pnl, pnlPercent };
    });

    setEnrichedHoldings(enriched);
    setTotalValue((portfolio?.cash || 0) + holdingsValue);
    setEnriching(false);
  }, [portfolio, holdings]);

  useEffect(() => {
    enrichHoldings();
  }, [enrichHoldings]);

  const handleRefresh = async () => {
    await refresh();
    await enrichHoldings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!portfolioId || !portfolio) {
    return <SetupModal />;
  }

  const totalInvested = 100000;
  const totalPnl = totalValue - totalInvested;
  const totalPnlPercent = (totalPnl / totalInvested) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Welcome back, {portfolio.name}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={enriching}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${enriching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Portfolio Value</p>
              <p className="text-lg font-bold text-white">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Cash Available</p>
              <p className="text-lg font-bold text-white">{formatCurrency(portfolio.cash)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                totalPnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              {totalPnl >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Total P&L</p>
              <p className={`text-lg font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                totalPnlPercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}
            >
              {totalPnlPercent >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Return</p>
              <p
                className={`text-lg font-bold ${
                  totalPnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatPercent(totalPnlPercent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Holdings</h2>
          <Link href="/trade" className="btn-primary text-sm py-1.5 px-3">
            + Trade
          </Link>
        </div>

        {enrichedHoldings.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No holdings yet.</p>
            <p className="text-gray-600 text-sm mt-1">Head to Trade to buy your first asset!</p>
            <Link href="/trade" className="btn-primary inline-block mt-4 text-sm">
              Start Trading
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 text-gray-400 font-medium">Symbol</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Qty</th>
                  <th className="text-right py-2 text-gray-400 font-medium hidden md:table-cell">Avg Cost</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Price</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Value</th>
                  <th className="text-right py-2 text-gray-400 font-medium">P&L</th>
                  <th className="text-right py-2 text-gray-400 font-medium hidden lg:table-cell">7D Chart</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {enrichedHoldings.map((h) => (
                  <tr key={h.symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3">
                      <div>
                        <p className="font-semibold text-white">{h.symbol}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px]">{h.name}</p>
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-300">{h.quantity}</td>
                    <td className="py-3 text-right text-gray-400 hidden md:table-cell">
                      {formatCurrency(h.avg_cost)}
                    </td>
                    <td className="py-3 text-right text-white">{formatCurrency(h.currentPrice)}</td>
                    <td className="py-3 text-right text-white font-medium">
                      {formatCurrency(h.currentValue)}
                    </td>
                    <td className="py-3 text-right">
                      <div className={h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        <p>{h.pnl >= 0 ? '+' : ''}{formatCurrency(h.pnl)}</p>
                        <p className="text-xs">{formatPercent(h.pnlPercent)}</p>
                      </div>
                    </td>
                    <td className="py-3 hidden lg:table-cell">
                      <div className="flex justify-end">
                        <Sparkline
                          symbol={h.symbol}
                          type={h.asset_type as AssetType}
                          positive={h.pnlPercent >= 0}
                        />
                      </div>
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(`/trade?symbol=${encodeURIComponent(h.symbol)}&type=${h.asset_type}&action=buy`)
                          }
                          className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                        >
                          Buy
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/trade?symbol=${encodeURIComponent(h.symbol)}&type=${h.asset_type}&action=sell`)
                          }
                          className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                        >
                          Sell
                        </button>
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
