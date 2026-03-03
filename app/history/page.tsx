'use client';

import { useState, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import SetupModal from '@/components/SetupModal';
import { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import { History, Filter } from 'lucide-react';

export default function HistoryPage() {
  const { portfolioId, loading } = usePortfolio();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTxs, setFilteredTxs] = useState<Transaction[]>([]);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!portfolioId) return;
    setFetching(true);
    fetch(`/api/history?portfolioId=${portfolioId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTransactions(data);
          setFilteredTxs(data);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [portfolioId]);

  useEffect(() => {
    let result = transactions;
    if (symbolFilter) {
      result = result.filter((t) =>
        t.symbol.toLowerCase().includes(symbolFilter.toLowerCase())
      );
    }
    if (actionFilter !== 'all') {
      result = result.filter((t) => t.action === actionFilter);
    }
    setFilteredTxs(result);
  }, [transactions, symbolFilter, actionFilter]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (!portfolioId) return <SetupModal />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Transaction History</h1>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input text-sm py-1.5"
            placeholder="Filter by symbol..."
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
          />
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(['all', 'buy', 'sell'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  actionFilter === a
                    ? a === 'buy'
                      ? 'bg-green-500 text-white'
                      : a === 'sell'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500 ml-auto">
            {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {fetching ? (
          <div className="text-center py-8 text-gray-400">Loading transactions...</div>
        ) : filteredTxs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-gray-600 text-sm mt-1">Your trade history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-2 text-gray-400 font-medium">Symbol</th>
                  <th className="text-center py-2 text-gray-400 font-medium">Action</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Quantity</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Price</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Total</th>
                  <th className="text-left py-2 text-gray-400 font-medium hidden md:table-cell">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="py-3 text-gray-400 text-xs">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <div>
                        <p className="font-semibold text-white">{tx.symbol}</p>
                        {tx.name && tx.name !== tx.symbol && (
                          <p className="text-xs text-gray-500 truncate max-w-[100px]">{tx.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          tx.action === 'buy'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tx.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-300">{tx.quantity}</td>
                    <td className="py-3 text-right text-white">{formatCurrency(tx.price)}</td>
                    <td className="py-3 text-right">
                      <span className={`font-semibold ${tx.action === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                        {tx.action === 'buy' ? '-' : '+'}{formatCurrency(tx.total)}
                      </span>
                    </td>
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-xs text-gray-500 capitalize">{tx.asset_type}</span>
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
