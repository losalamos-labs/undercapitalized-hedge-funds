export type AssetType = 'stock' | 'etf' | 'crypto' | 'forex' | 'commodity';

export interface Portfolio {
  id: string;
  name: string;
  cash: number;
  created_at: number;
}

export interface Holding {
  portfolio_id: string;
  symbol: string;
  asset_type: AssetType;
  name: string | null;
  quantity: number;
  avg_cost: number;
}

export interface Transaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  asset_type: AssetType;
  name: string | null;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
}

export interface QuoteResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  exchange?: string;
  currency?: string;
  type: AssetType;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type: AssetType;
  logoUrl?: string;
  coinGeckoId?: string;
}

export interface ChartPoint {
  date: string;
  close: number;
}

export interface HoldingWithValue extends Holding {
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioWithValue extends Portfolio {
  holdings: HoldingWithValue[];
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
}
