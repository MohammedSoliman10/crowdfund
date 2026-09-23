import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T027/T045 — pledge & unpledge controls: disabled+reason contract,
 * submit wiring, named pre-flight rejection surfaced inline.
 */
const mocks = vi.hoisted(() => ({
  pledgeRun: vi.fn(),
  unpledgeRun: vi.fn(),
  usePledge: vi.fn(),
  useUnpledge: vi.fn(),
  useToken: vi.fn(),
}));

vi.mock('../../src/hooks/useCampaignActions', () => ({
  usePledge: mocks.usePledge,
  useUnpledge: mocks.useUnpledge,
}));
vi.mock('../../src/hooks/useToken', () => ({ useToken: mocks.useToken }));

import { PledgeForm } from '../../src/components/actions/PledgeForm';
import { UnpledgeControls } from '../../src/components/actions/UnpledgeControls';
import { formatAmount } from '../../src/lib/format';
import type { ActionAvailability } from '../../src/types';

const ENABLED: ActionAvailability = { enabled: true, reason: null };
const BALANCE = 3_000n * 10n ** 18n;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usePledge.mockReturnValue({ run: mocks.pledgeRun, isPending: false });
  mocks.useUnpledge.mockReturnValue({ run: mocks.unpledgeRun, isPending: false });
  mocks.useToken.mockReturnValue({ balance: BALANCE, allowance: 0n });
});

describe('PledgeForm', () => {
  it('renders balance and the auto-approve hint when allowance is empty', () => {
    render(<PledgeForm campaignId={7} availability={ENABLED} />);
    expect(screen.getByTestId('token-balance')).toHaveTextContent('Balance: 3,000 CFT');
    expect(screen.getByText('An approval transaction will run automatically first.')).toBeInTheDocument();
  });

  it('is disabled with a plain-language reason when availability blocks it', () => {
    render(
      <PledgeForm
        campaignId={7}
        availability={{ enabled: false, reason: 'This campaign has ended.' }}
      />,
    );
    expect(screen.getByTestId('pledge-submit')).toHaveAttribute('aria-disabled', 'true');
    const reasons = screen.getAllByTestId('disabled-reason').map((n) => n.textContent);
    expect(reasons).toContain('This campaign has ended.');
    expect(screen.getByTestId('pledge-amount')).toBeDisabled();
    expect(screen.getByTestId('pledge-max')).toHaveAttribute('aria-disabled', 'true');
  });

  it('submits the entered amount with campaign id, balance, and allowance', async () => {
    mocks.pledgeRun.mockResolvedValue({ ok: true });
    render(<PledgeForm campaignId={7} availability={ENABLED} />);

    fireEvent.change(screen.getByTestId('pledge-amount'), { target: { value: '42.5' } });
    fireEvent.click(screen.getByTestId('pledge-submit'));

    await waitFor(() =>
      expect(mocks.pledgeRun).toHaveBeenCalledWith({
        amountText: '42.5',
        campaignId: 7,
        balance: BALANCE,
        allowance: 0n,
      }),
    );
    // success clears the field
    await waitFor(() => expect(screen.getByTestId('pledge-amount')).toHaveValue(''));
  });

  it('surfaces a named pre-flight rejection inline and keeps the amount', async () => {
    mocks.pledgeRun.mockResolvedValue({
      ok: false,
      message: 'You don’t have enough pledge tokens.',
    });
    render(<PledgeForm campaignId={7} availability={ENABLED} />);

    fireEvent.change(screen.getByTestId('pledge-amount'), { target: { value: '999999' } });
    fireEvent.click(screen.getByTestId('pledge-submit'));

    expect(await screen.findByText('You don’t have enough pledge tokens.')).toBeInTheDocument();
    expect(screen.getByTestId('pledge-amount')).toHaveValue('999999');
  });

  it('Max fills the field with the exact formatted balance', () => {
    render(<PledgeForm campaignId={7} availability={ENABLED} />);
    fireEvent.click(screen.getByTestId('pledge-max'));
    expect(screen.getByTestId('pledge-amount')).toHaveValue(formatAmount(BALANCE, 18, 18));
  });
});

describe('UnpledgeControls', () => {
  it('shows the personal stake and submits a bounded withdrawal', async () => {
    mocks.unpledgeRun.mockResolvedValue({ ok: true });
    const outstanding = 2_500n * 10n ** 18n;
    render(
      <UnpledgeControls campaignId={3} outstanding={outstanding} availability={ENABLED} />,
    );
    expect(screen.getByTestId('my-stake')).toHaveTextContent('Your stake: 2,500 CFT');

    fireEvent.change(screen.getByTestId('unpledge-amount'), { target: { value: '100' } });
    fireEvent.click(screen.getByTestId('unpledge-submit'));
    await waitFor(() =>
      expect(mocks.unpledgeRun).toHaveBeenCalledWith({
        amountText: '100',
        campaignId: 3,
        outstanding,
      }),
    );
  });

  it('is disabled with a reason when there is nothing to withdraw', () => {
    render(
      <UnpledgeControls
        campaignId={3}
        outstanding={0n}
        availability={{ enabled: false, reason: 'You have nothing to withdraw in this campaign.' }}
      />,
    );
    expect(screen.getByTestId('unpledge-submit')).toHaveAttribute('aria-disabled', 'true');
    const reasons = screen.getAllByTestId('disabled-reason').map((n) => n.textContent);
    expect(reasons).toContain('You have nothing to withdraw in this campaign.');
  });
});
