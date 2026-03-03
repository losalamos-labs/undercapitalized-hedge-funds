'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePortfolio } from '@/context/PortfolioContext';
import SetupModal from '@/components/SetupModal';
import { SearchResult, QuoteResult, ChartPoint, AssetType } from '@/lib/types';
import { formatCurrency, formatPercent, formatMarketCap } from '@/lib/format';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Search, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

type Range = '1d' | '1w' | '1mo' | '3mo' | '1y';

const RANGES: { label: string; value: Range }[] = [
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '1Y', value: '1y' },
];

function TradePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { portfolioId, portfolio, holdings, loading, refresh } = usePortfolio();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SearchResult | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [range, setRange] = useState<Range>('1mo');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Handle URL params (from dashboard quick buy/sell)
  useEffect(() => {
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') as AssetType | null;
    const act = searchParams.get('action') as 'buy' | 'sell' | null;
    if (symbol && type) {
      const asset: SearchResult = { symbol, name: symbol, type: type || 'stock' };
      setSelectedAsset(asset);
      setQuery(symbol);
      if (act) setAction(act);
    }
  }, [searchParams]);

  // Search debounce
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await resp.json();
        if (Array.isArray(data)) setSuggestions(data);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch quote when asset selected
  useEffect(() => {
    if (!selectedAsset) return;
    setQuoteLoading(true);
    setQuote(null);
    fetch(`/api/quote?symbol=${encodeURIComponent(selectedAsset.symbol)}&type=${selectedAsset.type}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.price) setQuote(data);
      })
      .catch(() => {})
      .finally(() => setQuoteLoading(false));
  }, [selectedAsset]);

  // Fetch chart
  useEffect(() => {
    if (!selectedAsset) return;
    setChartData([]);
    fetch(
      `/api/chart?symbol=${encodeURIComponent(selectedAsset.symbol)}&type=${selectedAsset.type}&range=${range}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setChartData(data);
      })
      .catch(() => {});
  }, [selectedAsset, range]);

  const selectAsset = (asset: SearchResult) => {
    setSelectedAsset(asset);
    setQuery(asset.name || asset.symbol);
    setShowSuggestions(false);
    setTradeError('');
    setTradeSuccess('');
    setQuantity('');
    router.replace(`/trade?symbol=${encodeURIComponent(asset.symbol)}&type=${asset.type}`);
  };

  const currentHolding = holdings.find(
    (h) => h.symbol === selectedAsset?.symbol
  );

  const estimatedTotal = quote && quantity ? quote.price * parseFloat(quantity) : 0;

  const executeTrade = async () => {
    if (!portfolioId || !selectedAsset || !quantity) return;
    setTradeLoading(true);
    setTradeError('');
    setTradeSuccess('');

    try {
      const resp = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          symbol: selectedAsset.symbol,
          type: selectedAsset.type,
          action,
          quantity: parseFloat(quantity),
          name: selectedAsset.name || quote?.name,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setTradeError(data.error || 'Trade failed');
        return;
      }

      setTradeSuccess(
        `${action === 'buy' ? '✅ Bought' : '✅ Sold'} ${quantity} ${selectedAsset.symbol} @ ${formatCurrency(data.price)}`
      );
      setQuantity('');
      await refresh();
    } catch {
      setTradeError('Network error. Please try again.');
    } finally {
      setTradeLoading(false);
    }
  };

  const formatChartDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (range === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (range === '1y') return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (!portfolioId) return <SetupModal />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Trade</h1>

      {/* Search */}
      <div className="card" ref={searchRef}>
        <label className="block text-sm font-medium text-gray-300 mb-2">Search Asset</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="input w-full pl-9"
            placeholder="Search by ticker or name (e.g. AAPL, bitcoin, EURUSD=X, GC=F)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.symbol}-${i}`}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700 transition-colors text-left"
                  onMouseDown={() => selectAsset(s)}
                >
                  <div>
                    <span className="font-semibold text-white">{s.symbol}</span>
                    <span className="text-gray-400 text-sm ml-2">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.exchange && (
                      <span className="text-xs text-gray-500">{s.exchange}</span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        s.type === 'crypto'
                          ? 'bg-orange-500/20 text-orange-400'
                          : s.type === 'etf'
                          ? 'bg-blue-500/20 text-blue-400'
                          : s.type === 'forex'
                          ? 'bg-purple-500/20 text-purple-400'
                          : s.type === 'commodity'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {s.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAsset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Chart + Quote */}
          <div className="lg:col-span-2 space-y-4">
            {/* Asset Header */}
            <div className="card">
              {quoteLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-6 bg-gray-800 rounded w-1/3" />
                  <div className="h-10 bg-gray-800 rounded w-1/2" />
                </div>
              ) : quote ? (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-white">{quote.name}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-gray-400">{selectedAsset.symbol}</span>
                        {quote.exchange && (
                          <span className="text-xs text-gray-500">· {quote.exchange}</span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            selectedAsset.type === 'crypto'
                              ? 'bg-orange-500/20 text-orange-400'
                              : selectedAsset.type === 'etf'
                              ? 'bg-blue-500/20 text-blue-400'
                              : selectedAsset.type === 'forex'
                              ? 'bg-purple-500/20 text-purple-400'
                              : selectedAsset.type === 'commodity'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {selectedAsset.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-white">{formatCurrency(quote.price)}</p>
                      <div
                        className={`flex items-center gap-1 justify-end ${
                          quote.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {quote.change >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)} (
                          {formatPercent(quote.changePercent)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {quote.marketCap && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <span className="text-sm text-gray-400">Market Cap: </span>
                      <span className="text-sm text-white">{formatMarketCap(quote.marketCap)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Failed to load quote</p>
              )}
            </div>

            {/* Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-300">Price Chart</h3>
                <div className="flex gap-1">
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        range === r.value
                          ? 'bg-green-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-gray-500 text-sm">Loading chart...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#f9fafb',
                      }}
                      formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value), 'Price'] : ['N/A', 'Price']}
                      labelFormatter={(label) => formatChartDate(label)}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#4ade80' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right: Trade Form */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Place Order</h3>

              {/* Buy/Sell Toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-4">
                <button
                  onClick={() => setAction('buy')}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                    action === 'buy' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setAction('sell')}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                    action === 'sell' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Portfolio Info */}
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Cash Balance</span>
                  <span className="text-white font-medium">{formatCurrency(portfolio?.cash || 0)}</span>
                </div>
                {currentHolding && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">You hold</span>
                    <span className="text-white font-medium">
                      {currentHolding.quantity} {selectedAsset.symbol}
                    </span>
                  </div>
                )}
                {quote && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Current Price</span>
                    <span className="text-white font-medium">{formatCurrency(quote.price)}</span>
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                <input
                  type="number"
                  className="input w-full"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="0"
                  step="any"
                />
                {quote && quantity && !isNaN(parseFloat(quantity)) && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Total</span>
                    <span className="text-white font-semibold">{formatCurrency(estimatedTotal)}</span>
                  </div>
                )}
              </div>

              {/* Quick fill buttons */}
              {quote && portfolio && action === 'buy' && (
                <div className="flex gap-2 mb-4">
                  {[25, 50, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        const maxQty = (portfolio.cash * (pct / 100)) / quote.price;
                        setQuantity(maxQty.toFixed(4));
                      }}
                      className="flex-1 text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const maxQty = portfolio.cash / quote.price;
                      setQuantity(maxQty.toFixed(4));
                    }}
                    className="flex-1 text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    MAX
                  </button>
                </div>
              )}

              {action === 'sell' && currentHolding && (
                <div className="flex gap-2 mb-4">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        const qty = currentHolding.quantity * (pct / 100);
                        setQuantity(qty.toFixed(4));
                      }}
                      className="flex-1 text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}

              {tradeError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{tradeError}</p>
                </div>
              )}

              {tradeSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                  <p className="text-green-400 text-sm">{tradeSuccess}</p>
                </div>
              )}

              <button
                onClick={executeTrade}
                disabled={
                  tradeLoading ||
                  !quantity ||
                  isNaN(parseFloat(quantity)) ||
                  parseFloat(quantity) <= 0 ||
                  !quote
                }
                className={`w-full py-3 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'buy'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {tradeLoading
                  ? 'Processing...'
                  : `${action === 'buy' ? 'Buy' : 'Sell'} ${selectedAsset.symbol}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedAsset && (
        <div className="card text-center py-16">
          <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Search for an asset above to start trading</p>
          <p className="text-gray-600 text-sm mt-2">
            Try: AAPL, bitcoin, EURUSD=X, GC=F (gold), SPY
          </p>
        </div>
      )}
    </div>
  );
}

export default function TradePageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>}>
      <TradePage />
    </Suspense>
  );
}
