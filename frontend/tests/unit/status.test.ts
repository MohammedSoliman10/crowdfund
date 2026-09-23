import { describe, expect, it } from 'vitest';
import { deriveStatus, isClaimable, isRefundable, nowSeconds } from '../../src/lib/status';
import type { CampaignRecord } from '../../src/types';

const NOW = 1_800_000_000;

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: 1,
    creator: '0xAbc0000000000000000000000000000000000001',
    goal: 1_000n,
    pledged: 500n,
    startAt: NOW + 100,
    endAt: NOW + 1000,
    claimed: false,
    title: 'Test',
    description: 'Desc',
    ...overrides,
  };
}

describe('deriveStatus', () => {
  it('is upcoming before start', () => {
    expect(deriveStatus(campaign(), NOW)).toBe('upcoming');
  });

  it('is live exactly at start', () => {
    const c = campaign({ startAt: NOW, endAt: NOW + 100 });
    expect(deriveStatus(c, NOW)).toBe('live');
  });

  it('is live exactly at end (inclusive boundary)', () => {
    const c = campaign({ startAt: NOW - 10, endAt: NOW });
    expect(deriveStatus(c, NOW)).toBe('live');
  });

  it('is successful after end when goal met', () => {
    const c = campaign({ startAt: NOW - 100, endAt: NOW - 1, pledged: 1_000n, goal: 1_000n });
    expect(deriveStatus(c, NOW)).toBe('successful');
  });

  it('is failed after end when goal missed', () => {
    const c = campaign({ startAt: NOW - 100, endAt: NOW - 1, pledged: 999n, goal: 1_000n });
    expect(deriveStatus(c, NOW)).toBe('failed');
  });

  it('is cancelled when creator is the zero address', () => {
    const c = campaign({ creator: '0x0000000000000000000000000000000000000000' });
    expect(deriveStatus(c, NOW)).toBe('cancelled');
  });

  it('treats creator address case-insensitively', () => {
    const c = campaign({ creator: '0x0000000000000000000000000000000000000000'.toUpperCase().replace('0X', '0x') });
    expect(deriveStatus(c, NOW)).toBe('cancelled');
  });
});

describe('claim/refund eligibility helpers', () => {
  it('claimable only when successful and unclaimed', () => {
    const base = { startAt: NOW - 100, endAt: NOW - 1, pledged: 1_000n, goal: 1_000n };
    expect(isClaimable(campaign(base), NOW)).toBe(true);
    expect(isClaimable(campaign({ ...base, claimed: true }), NOW)).toBe(false);
    expect(isClaimable(campaign({ ...base, pledged: 1n }), NOW)).toBe(false);
  });

  it('refundable only when failed', () => {
    const base = { startAt: NOW - 100, endAt: NOW - 1 };
    expect(isRefundable(campaign({ ...base, pledged: 1n, goal: 1_000n }), NOW)).toBe(true);
    expect(isRefundable(campaign({ ...base, pledged: 1_000n, goal: 1_000n }), NOW)).toBe(false);
    expect(isRefundable(campaign(), NOW)).toBe(false);
  });
});

describe('nowSeconds', () => {
  it('tracks wall clock', () => {
    expect(Math.abs(nowSeconds() - Math.floor(Date.now() / 1000))).toBeLessThanOrEqual(1);
  });
});
