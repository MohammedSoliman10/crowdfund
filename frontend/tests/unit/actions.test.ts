import { describe, expect, it } from 'vitest';
import { getActionAvailability } from '../../src/lib/actions';
import { M } from '../../src/lib/errors';
import type { CampaignRecord, WalletSession } from '../../src/types';

const NOW = 1_800_000_000;
const CREATOR = '0xAbc0000000000000000000000000000000000001';
const BACKER = '0xDef0000000000000000000000000000000000002';

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: 7,
    creator: CREATOR,
    goal: 1_000n,
    pledged: 400n,
    startAt: NOW - 10,
    endAt: NOW + 100, // live
    claimed: false,
    title: 'T',
    description: 'D',
    ...overrides,
  };
}

function session(overrides: Partial<WalletSession> = {}): WalletSession {
  return { connection: 'connected', address: BACKER, chainId: 31337, networkOk: true, ...overrides };
}

function availability(
  campaignValue: CampaignRecord | null,
  sessionValue: WalletSession,
  outstanding = 0n,
  now = NOW,
) {
  return getActionAvailability({
    campaign: campaignValue,
    session: sessionValue,
    contribution: { outstanding },
    now,
  });
}

describe('session gate applies to every action', () => {
  it('disconnected wallet blocks with connect message', () => {
    const a = availability(campaign(), session({ connection: 'disconnected', address: undefined }));
    for (const key of ['launch', 'cancel', 'pledge', 'unpledge', 'claim', 'refund'] as const) {
      expect(a[key].enabled).toBe(false);
      expect(a[key].reason).toBe(M.CONNECT_REQUIRED);
    }
  });

  it('missing wallet blocks with install message', () => {
    const a = availability(campaign(), session({ connection: 'no-wallet', address: undefined }));
    expect(a.launch.enabled).toBe(false);
    expect(a.launch.reason).toContain('injected wallet');
  });

  it('wrong network blocks with switch message', () => {
    const a = availability(campaign(), session({ chainId: 1, networkOk: false }));
    expect(a.pledge.enabled).toBe(false);
    expect(a.pledge.reason).toBe(M.WRONG_CHAIN);
    expect(a.launch.reason).toBe(M.WRONG_CHAIN);
  });
});

describe('pledge matrix', () => {
  it('enabled while live', () => {
    expect(availability(campaign(), session()).pledge.enabled).toBe(true);
  });

  it('blocked before start', () => {
    const a = availability(campaign({ startAt: NOW + 50 }), session());
    expect(a.pledge.enabled).toBe(false);
    expect(a.pledge.reason).toBe(M.NOT_STARTED);
  });

  it('blocked after end', () => {
    const a = availability(campaign({ endAt: NOW - 1 }), session());
    expect(a.pledge.enabled).toBe(false);
    expect(a.pledge.reason).toBe(M.ENDED);
  });
});

describe('unpledge matrix', () => {
  it('enabled while live with a stake', () => {
    expect(availability(campaign(), session(), 100n).unpledge.enabled).toBe(true);
  });

  it('blocked with zero stake', () => {
    const a = availability(campaign(), session(), 0n);
    expect(a.unpledge.enabled).toBe(false);
    expect(a.unpledge.reason).toBe(M.NOTHING_TO_WITHDRAW);
  });

  it('blocked after end', () => {
    const a = availability(campaign({ endAt: NOW - 1 }), session(), 100n);
    expect(a.unpledge.enabled).toBe(false);
    expect(a.unpledge.reason).toBe(M.ENDED);
  });
});

describe('claim matrix', () => {
  const successful = { pledged: 1_000n, goal: 1_000n, startAt: NOW - 100, endAt: NOW - 1 };
  const creatorSession = session({ address: CREATOR });

  it('enabled for creator on successful unclaimed', () => {
    const a = availability(campaign(successful), creatorSession);
    expect(a.claim.enabled).toBe(true);
  });

  it('blocked for non-creator', () => {
    const a = availability(campaign(successful), session());
    expect(a.claim.enabled).toBe(false);
    expect(a.claim.reason).toBe(M.NOT_CREATOR);
  });

  it('blocked before end', () => {
    const a = availability(campaign(), creatorSession);
    expect(a.claim.reason).toBe(M.NOT_ENDED);
  });

  it('blocked on failed campaign', () => {
    const a = availability(campaign({ ...successful, pledged: 1n }), creatorSession);
    expect(a.claim.reason).toBe(M.GOAL_MISSED);
  });

  it('blocked when already claimed', () => {
    const a = availability(campaign({ ...successful, claimed: true }), creatorSession);
    expect(a.claim.reason).toBe(M.CLAIMED);
  });
});

describe('refund matrix', () => {
  const failed = { pledged: 100n, goal: 1_000n, startAt: NOW - 100, endAt: NOW - 1 };

  it('enabled for backer with stake on failed campaign', () => {
    expect(availability(campaign(failed), session(), 50n).refund.enabled).toBe(true);
  });

  it('blocked when goal met', () => {
    const a = availability(campaign({ ...failed, pledged: 1_000n }), session(), 50n);
    expect(a.refund.enabled).toBe(false);
    expect(a.refund.reason).toBe(M.GOAL_MET);
  });

  it('blocked before end', () => {
    const a = availability(campaign(), session(), 50n);
    expect(a.refund.reason).toBe(M.NOT_ENDED);
  });

  it('blocked with zero stake', () => {
    const a = availability(campaign(failed), session(), 0n);
    expect(a.refund.reason).toBe(M.NOTHING_TO_REFUND);
  });
});

describe('cancel matrix', () => {
  const upcoming = { startAt: NOW + 100, endAt: NOW + 200 };

  it('enabled for creator before start', () => {
    const a = availability(campaign(upcoming), session({ address: CREATOR }));
    expect(a.cancel.enabled).toBe(true);
  });

  it('blocked after start', () => {
    const a = availability(campaign(), session({ address: CREATOR }));
    expect(a.cancel.reason).toBe(M.ALREADY_STARTED);
  });

  it('blocked for non-creator', () => {
    const a = availability(campaign(upcoming), session());
    expect(a.cancel.reason).toBe(M.NOT_CREATOR);
  });
});

describe('launch matrix + null campaign', () => {
  it('launch enabled when connected on the right chain', () => {
    const a = availability(null, session());
    expect(a.launch.enabled).toBe(true);
  });

  it('campaign-scoped actions explain that no campaign is open', () => {
    const a = availability(null, session());
    expect(a.pledge.enabled).toBe(false);
    expect(a.pledge.reason).toContain('Open a campaign');
  });
});
