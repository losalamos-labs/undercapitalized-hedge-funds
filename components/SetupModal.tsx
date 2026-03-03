'use client';

import { useState } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { TrendingUp } from 'lucide-react';

export default function SetupModal() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setPortfolioId } = usePortfolio();

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a display name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || 'Failed to create portfolio');
        return;
      }
      const portfolio = await resp.json();
      setPortfolioId(portfolio.id);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to MarketSim</h1>
        <p className="text-gray-400 mb-8">
          Practice investing with <span className="text-green-400 font-semibold">$100,000</span> virtual cash.
          Trade global stocks, ETFs, crypto, forex, and commodities — no real money at risk.
        </p>

        <div className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Choose a display name
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. WarrenB, CryptoKing..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              maxLength={30}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? 'Creating...' : 'Start Trading →'}
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-600">
          Your portfolio is stored locally and identified by your browser. No account required.
        </p>
      </div>
    </div>
  );
}
