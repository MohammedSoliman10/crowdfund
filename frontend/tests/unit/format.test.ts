import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatCompact,
  formatDuration,
  formatTimingLabel,
  parseAmount,
  progressPct,
  shortenAddress,
} from '../../src/lib/format';

describe('formatAmount', () => {
  it('formats whole token amounts with grouping', () => {
    expect(formatAmount(1_000n * 10n ** 18n)).toBe('1,000');
    expect(formatAmount(1_234_567n * 10n ** 18n)).toBe('1,234,567');
  });

  it('returns 0 for zero', () => {
    expect(formatAmount(0n)).toBe('0');
  });

  it('keeps significant fraction digits and trims noise', () => {
    expect(formatAmount(15n * 10n ** 17n)).toBe('1.5');
    expect(formatAmount(1_234_567_890_123_456_789n)).toBe('1.2345');
    expect(formatAmount(10n ** 15n)).toBe('0.001');
  });

  it('handles very large values without overflow', () => {
    // 10^36 wei = 10^18 whole tokens
    expect(formatAmount(10n ** 36n)).toBe('1,000,000,000,000,000,000');
    // 10^54 wei = 10^36 whole tokens — grouping correct, no precision loss
    expect(formatAmount(10n ** 54n).replace(/,/g, '')).toBe(`1${'0'.repeat(36)}`);
  });
});

describe('formatCompact', () => {
  it('compacts thousands/millions/billions', () => {
    expect(formatCompact(1_500n * 10n ** 18n)).toBe('1.5K');
    expect(formatCompact(2_500_000n * 10n ** 18n)).toBe('2.5M');
    expect(formatCompact(3_000_000_000n * 10n ** 18n)).toBe('3B');
    expect(formatCompact(42n * 10n ** 18n)).toBe('42');
  });
});

describe('progressPct', () => {
  it('is 0 when goal is zero', () => {
    expect(progressPct(100n, 0n)).toBe(0);
  });

  it('handles exact and partial funding', () => {
    expect(progressPct(1_000n, 1_000n)).toBe(100);
    expect(progressPct(620n, 1_000n)).toBe(62);
  });

  it('may exceed 100 when over-funded', () => {
    expect(progressPct(1_500n, 1_000n)).toBe(150);
  });
});

describe('shortenAddress', () => {
  it('keeps 6 leading and 4 trailing characters', () => {
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('passes through empty values', () => {
    expect(shortenAddress('')).toBe('');
  });
});

describe('formatDuration / formatTimingLabel', () => {
  it('formats durations at multiple scales', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3_900)).toBe('1h 5m');
    expect(formatDuration(90_000)).toBe('1d 1h');
    expect(formatDuration(0)).toBe('0s');
  });

  it('labels starts, ends, and ended states', () => {
    const now = 1_800_000_000;
    expect(formatTimingLabel(now + 3_600, now + 7_200, now)).toBe('Starts in 1h 0m');
    expect(formatTimingLabel(now - 60, now + 60, now)).toBe('Ends in 1m 0s');
    expect(formatTimingLabel(now - 200, now - 100, now)).toContain('Ended');
  });
});

describe('parseAmount', () => {
  it('parses decimals into 18-decimals bigint', () => {
    expect(parseAmount('1.5')).toBe(1_500_000_000_000_000_000n);
    expect(parseAmount('0')).toBe(0n);
    expect(parseAmount('.5')).toBe(500_000_000_000_000_000n);
  });

  it('rejects invalid, empty, and over-precise input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('.')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-3')).toBeNull();
    expect(parseAmount('1.1234567890123456789')).toBeNull();
  });
});
