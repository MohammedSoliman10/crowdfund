import type { CampaignRecord, CampaignStatus } from '../types';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Single source of truth for FR-003 status + data-model state machine.
 * Consumed by cards, detail view, filter tabs, and action availability —
 * components must not re-implement these rules (ui-state-contracts §4).
 */
export function deriveStatus(c: CampaignRecord, now: number): CampaignStatus {
  // Cancelled campaigns are deleted on-chain; reads of stale ids return creator = 0x0
  if (!c.creator || c.creator.toLowerCase() === ZERO_ADDRESS) return 'cancelled';
  if (now < c.startAt) return 'upcoming';
  if (now <= c.endAt) return 'live';
  return c.pledged >= c.goal ? 'successful' : 'failed';
}

export function isActive(status: CampaignStatus): boolean {
  return status === 'live';
}

export function hasEnded(status: CampaignStatus): boolean {
  return status === 'successful' || status === 'failed';
}

/** Claim eligibility beyond status: successful + not yet claimed */
export function isClaimable(c: CampaignRecord, now: number): boolean {
  return deriveStatus(c, now) === 'successful' && !c.claimed;
}

/** Refund eligibility beyond status: failed (goal missed) */
export function isRefundable(c: CampaignRecord, now: number): boolean {
  return deriveStatus(c, now) === 'failed';
}
