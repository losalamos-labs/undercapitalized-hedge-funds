import { describe, expect, it } from 'vitest';
import { guessAssetType } from './asset';

describe('guessAssetType', () => {
  it('detects forex', () => {
    expect(guessAssetType('EURUSD=X')).toBe('forex');
  });

  it('detects commodities', () => {
    expect(guessAssetType('GC=F')).toBe('commodity');
  });

  it('detects etfs by quoteType', () => {
    expect(guessAssetType('SPY', 'ETF')).toBe('etf');
  });

  it('detects known crypto ids', () => {
    expect(guessAssetType('bitcoin')).toBe('crypto');
  });
});
