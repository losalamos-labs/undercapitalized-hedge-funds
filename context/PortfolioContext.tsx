'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Portfolio, Holding } from '@/lib/types';

interface PortfolioContextValue {
  portfolioId: string | null;
  portfolio: Portfolio | null;
  holdings: Holding[];
  totalValue: number;
  loading: boolean;
  setPortfolioId: (id: string) => void;
  refresh: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue>({
  portfolioId: null,
  portfolio: null,
  holdings: [],
  totalValue: 0,
  loading: true,
  setPortfolioId: () => {},
  refresh: async () => {},
});

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolioId, setPortfolioIdState] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  const setPortfolioId = useCallback((id: string) => {
    localStorage.setItem('portfolioId', id);
    setPortfolioIdState(id);
  }, []);

  const fetchPortfolio = useCallback(async (id: string) => {
    try {
      const resp = await fetch(`/api/portfolio?id=${id}`);
      if (!resp.ok) return;
      const data = await resp.json();
      setPortfolio(data.portfolio);
      setHoldings(data.holdings);

      // Fetch current prices for holdings to compute total value
      const holdingsData = data.holdings as Holding[];
      if (holdingsData.length === 0) {
        setTotalValue(data.portfolio.cash);
        return;
      }

      const priceResults = await Promise.allSettled(
        holdingsData.map((h) =>
          fetch(`/api/quote?symbol=${encodeURIComponent(h.symbol)}&type=${h.asset_type}`)
            .then((r) => r.json())
        )
      );

      let holdingsValue = 0;
      priceResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value?.price) {
          holdingsValue += holdingsData[i].quantity * result.value.price;
        } else {
          holdingsValue += holdingsData[i].quantity * holdingsData[i].avg_cost;
        }
      });

      setTotalValue(data.portfolio.cash + holdingsValue);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (portfolioId) {
      await fetchPortfolio(portfolioId);
    }
  }, [portfolioId, fetchPortfolio]);

  useEffect(() => {
    const stored = localStorage.getItem('portfolioId');
    if (stored) {
      setPortfolioIdState(stored);
      fetchPortfolio(stored).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchPortfolio]);

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolio(portfolioId).finally(() => setLoading(false));
    }
  }, [portfolioId, fetchPortfolio]);

  return (
    <PortfolioContext.Provider
      value={{ portfolioId, portfolio, holdings, totalValue, loading, setPortfolioId, refresh }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
