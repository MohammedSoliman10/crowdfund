import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T048/T049/T054 — launch lifecycle: the dialog surfaces the REAL
 * validateLaunch rule names for every violation, sends nothing on
 * rejection, and reports the decoded id on success; plus the
 * cancel/claim/refund disabled-reason paths of the eligibility matrix.
 */
const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  useLaunch: vi.fn(),
  useChainNow: vi.fn(),
  useWalletSession: vi.fn(),
}));

vi.mock('../../src/hooks/useCampaignActions', () => ({ useLaunch: mocks.useLaunch }));
vi.mock('../../src/hooks/useChainNow', () => ({
  useChainNow: mocks.useChainNow,
  useChainNowOrWall: mocks.useChainNow,
}));
vi.mock('../../src/hooks/useWalletSession', () => ({
  useWalletSession: mocks.useWalletSession,
  hasInjectedWallet: () => true,
}));

import { LaunchDialog } from '../../src/components/launch/LaunchDialog';
import { getActionAvailability } from '../../src/lib/actions';
import { M } from '../../src/lib/errors';
import { validateLaunch } from '../../src/lib/validate/launch';
import type { CampaignRecord, WalletSession } from '../../src/types';

const NOW = 1_700_000_000;
const CREATOR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const BACKER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

/** Same local formatting the dialog uses for its datetime-local defaults */
function toLocal(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fillForm(values: {
  goal?: string;
  title?: string;
  description?: string;
  start?: string;
  end?: string;
}) {
  if (values.goal !== undefined) {
    fireEvent.change(screen.getByTestId('launch-goal'), { target: { value: values.goal } });
  }
  if (values.title !== undefined) {
    fireEvent.change(screen.getByTestId('launch-title'), { target: { value: values.title } });
  }
  if (values.description !== undefined) {
    fireEvent.change(screen.getByTestId('launch-description'), {
      target: { value: values.description },
    });
  }
  if (values.start !== undefined) {
    fireEvent.change(screen.getByTestId('launch-start'), { target: { value: values.start } });
  }
  if (values.end !== undefined) {
    fireEvent.change(screen.getByTestId('launch-end'), { target: { value: values.end } });
  }
}

function submit() {
  fireEvent.click(screen.getByTestId('launch-submit'));
}

/** submit() resolves asynchronously — wait for the named rule to render */
async function expectRule(message: string) {
  const el = await screen.findByTestId('launch-error-message');
  expect(el).toHaveTextContent(message);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useChainNow.mockReturnValue(NOW);
  mocks.useWalletSession.mockReturnValue({
    session: { connection: 'connected', address: CREATOR, chainId: 31337, networkOk: true },
    connect: vi.fn(),
    disconnect: vi.fn(),
    isPending: false,
    error: null,
  });
  // Real rule engine behind the mocked hook — the dialog must relay its names
  mocks.useLaunch.mockImplementation(() => ({
    run: vi.fn(async (input: Parameters<typeof validateLaunch>[0]) => {
      const result = validateLaunch(input, NOW);
      return result.ok ? { ok: true, id: 9 } : { ok: false, message: result.message };
    }),
    isPending: false,
  }));
});

function renderDialog() {
  const onLaunched = vi.fn();
  const onClose = vi.fn();
  render(<LaunchDialog open onClose={onClose} onLaunched={onLaunched} />);
  return { onLaunched, onClose };
}

describe('LaunchDialog — every violation named, nothing sent', () => {
  it('rejects a non-numeric goal', async () => {
    renderDialog();
    fillForm({ goal: 'abc', title: 'T', description: 'D' });
    submit();
    await expectRule(M.AMOUNT_INVALID);
  });

  it('rejects a zero goal', async () => {
    renderDialog();
    fillForm({ goal: '0', title: 'T', description: 'D' });
    submit();
    await expectRule(M.GOAL_ZERO);
  });

  it('rejects an empty title', async () => {
    renderDialog();
    fillForm({ goal: '100', title: '   ', description: 'D' });
    submit();
    await expectRule(M.TITLE_EMPTY);
  });

  it('rejects a title over 80 bytes', async () => {
    renderDialog();
    fillForm({ goal: '100', title: 'x'.repeat(81), description: 'D' });
    submit();
    await expectRule(M.TITLE_LONG);
  });

  it('rejects an empty description', async () => {
    renderDialog();
    fillForm({ goal: '100', title: 'Solar Bus Shelter', description: ' ' });
    submit();
    await expectRule(M.DESC_EMPTY);
  });

  it('rejects a description over 500 bytes', async () => {
    renderDialog();
    fillForm({ goal: '100', title: 'Solar Bus Shelter', description: 'y'.repeat(501) });
    submit();
    await expectRule(M.DESC_LONG);
  });

  it('rejects a start time in the past (vs chain time)', async () => {
    renderDialog();
    fillForm({
      goal: '100',
      title: 'Solar Bus Shelter',
      description: 'A valid description.',
      start: toLocal(NOW - 3_600),
      end: toLocal(NOW + 7 * 86_400),
    });
    submit();
    await expectRule(M.START_IN_PAST);
  });

  it('rejects an end time before the start time', async () => {
    renderDialog();
    fillForm({
      goal: '100',
      title: 'Solar Bus Shelter',
      description: 'A valid description.',
      start: toLocal(NOW + 3_600),
      end: toLocal(NOW),
    });
    submit();
    await expectRule(M.END_BEFORE_START);
  });

  it('rejects a run longer than 90 days from now', async () => {
    renderDialog();
    fillForm({
      goal: '100',
      title: 'Solar Bus Shelter',
      description: 'A valid description.',
      end: toLocal(NOW + 91 * 86_400),
    });
    submit();
    await expectRule(M.MAX_DURATION);
  });

  it('valid submission reports the decoded campaign id and shows no error', async () => {
    const { onLaunched } = renderDialog();
    fillForm({
      goal: '2500',
      title: 'Solar Bus Shelter',
      description: 'A perfectly valid campaign description.',
    });
    submit();
    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith(9));
    expect(screen.queryByTestId('launch-error-message')).toBeNull();
  });
});

describe('eligibility matrix — disabled reasons (T054)', () => {
  const session = (address: string): WalletSession => ({
    connection: 'connected',
    address: address as `0x${string}`,
    chainId: 31337,
    networkOk: true,
  });

  const campaign = (partial: Partial<CampaignRecord>): CampaignRecord => ({
    id: 1,
    creator: CREATOR,
    goal: 1_000n * 10n ** 18n,
    pledged: 0n,
    startAt: NOW - 3_600,
    endAt: NOW + 3_600,
    claimed: false,
    title: 'Fixture',
    description: 'Fixture campaign',
    ...partial,
  });

  const availabilityFor = (c: CampaignRecord, viewer: WalletSession, outstanding = 0n) =>
    getActionAvailability({ campaign: c, session: viewer, contribution: { outstanding }, now: NOW });

  it('cancel: non-creator sees the creator-only reason', () => {
    const a = availabilityFor(campaign({ startAt: NOW + 3_600 }), session(BACKER));
    expect(a.cancel.enabled).toBe(false);
    expect(a.cancel.reason).toBe(M.NOT_CREATOR);
  });

  it('cancel: started campaigns explain they cannot be cancelled', () => {
    const a = availabilityFor(campaign({ startAt: NOW - 3_600 }), session(CREATOR));
    expect(a.cancel.enabled).toBe(false);
    expect(a.cancel.reason).toBe(M.ALREADY_STARTED);
  });

  it('claim: blocked before the campaign ends', () => {
    const a = availabilityFor(campaign({ endAt: NOW + 3_600 }), session(CREATOR));
    expect(a.claim.enabled).toBe(false);
    expect(a.claim.reason).toBe(M.NOT_ENDED);
  });

  it('claim: blocked once funds were already claimed', () => {
    const a = availabilityFor(
      campaign({ endAt: NOW - 3_600, pledged: 2_000n * 10n ** 18n, claimed: true }),
      session(CREATOR),
    );
    expect(a.claim.enabled).toBe(false);
    expect(a.claim.reason).toBe(M.CLAIMED);
  });

  it('refund: zero stake on a failed campaign reports nothing to refund', () => {
    const a = availabilityFor(
      campaign({ endAt: NOW - 3_600, pledged: 100n * 10n ** 18n }),
      session(BACKER),
      0n,
    );
    expect(a.refund.enabled).toBe(false);
    expect(a.refund.reason).toBe(M.NOTHING_TO_REFUND);
  });
});
