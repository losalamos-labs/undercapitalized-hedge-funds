'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { AssetType, ChartPoint } from '@/lib/types';

interface SparklineProps {
  symbol: string;
  type: AssetType;
  positive: boolean;
}

export default function Sparkline({ symbol, type, positive }: SparklineProps) {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&type=${type}&range=1w`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setData(d);
      })
      .catch(() => {});
  }, [symbol, type]);

  if (data.length === 0) {
    return <div className="w-24 h-10 bg-gray-800 rounded animate-pulse" />;
  }

  return (
    <div className="w-24 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="close"
            stroke={positive ? '#4ade80' : '#f87171'}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
