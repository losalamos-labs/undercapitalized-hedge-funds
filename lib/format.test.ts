import { describe, expect, it } from 'vitest';
import { formatCurrency, formatMarketCap, formatPercent } from './format';

describe('format', () => {
  it('formats currency with 2 decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats percent with sign by default', () => {
    expect(formatPercent(1.234)).toBe('+1.23%');
    expect(formatPercent(-1.234)).toBe('-1.23%');
  });

  it('formats market cap abbreviations', () => {
    expect(formatMarketCap(1_500_000)).toBe('$1.50M');
    expect(formatMarketCap(2_500_000_000)).toBe('$2.50B');
  });
});
