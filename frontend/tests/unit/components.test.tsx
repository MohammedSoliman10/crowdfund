import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../src/components/retro/Button';
import { CampaignCard } from '../../src/components/campaigns/CampaignCard';
import { Terminal } from '../../src/components/retro/Terminal';
import { appendMessage, clearMessages } from '../../src/stores/terminalStore';
import type { CampaignRecord } from '../../src/types';

const base: CampaignRecord = {
  id: 3,
  creator: '0xAbc0000000000000000000000000000000000001',
  goal: 1_000n * 10n ** 18n,
  pledged: 620n * 10n ** 18n,
  startAt: 1_700_000_000,
  endAt: 1_900_000_000,
  claimed: false,
  title: 'Solar Bus Shelter',
  description: 'Raise funds for 10 shelters across the city.',
};

describe('Button disabled-reason contract', () => {
  it('renders a visible plain-language reason when disabled', () => {
    render(
      <Button disabled reason="Only the campaign creator can do that." testId="b">
        Claim
      </Button>,
    );
    expect(screen.getByTestId('b')).toBeInTheDocument();
    expect(screen.getByTestId('disabled-reason')).toHaveTextContent('Only the campaign creator');
    expect(screen.getByTestId('b')).toHaveAttribute('aria-disabled', 'true');
  });

  it('logs an error in dev when disabled without a reason', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <Button disabled testId="b">
        Claim
      </Button>,
    );
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled reason="nope" onClick={onClick} testId="b">
        Go
      </Button>,
    );
    await userEvent.click(screen.getByTestId('b'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} testId="b">
        Go
      </Button>,
    );
    await userEvent.click(screen.getByTestId('b'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CampaignCard', () => {
  const NOW = 1_800_000_000; // inside [start, end] → live

  it('renders title, status, goal, pledged, timing', () => {
    render(<CampaignCard record={base} now={NOW} />);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Solar Bus Shelter');
    expect(screen.getByTestId('status-chip')).toHaveTextContent('LIVE');
    expect(screen.getByTestId('card-pledged')).toHaveTextContent('62% funded');
    expect(screen.getByTestId('card-goal')).toHaveTextContent('Goal 1K');
    expect(screen.getByTestId('card-timing')).toHaveTextContent('Ends in');
    expect(screen.getByTestId('card-progress')).toHaveAttribute('aria-valuenow', '62');
  });

  it('marks successful/failed/cancelled correctly', () => {
    const { unmount } = render(
      <CampaignCard record={{ ...base, pledged: 2_000n * 10n ** 18n, startAt: NOW - 10, endAt: NOW - 1 }} now={NOW} />,
    );
    expect(screen.getByTestId('status-chip')).toHaveTextContent('SUCCESSFUL');
    unmount();

    render(
      <CampaignCard record={{ ...base, pledged: 0n, startAt: NOW - 10, endAt: NOW - 1 }} now={NOW} />,
    );
    expect(screen.getByTestId('status-chip')).toHaveTextContent('FAILED');
  });

  it('shows claimed tag after claim', () => {
    render(
      <CampaignCard record={{ ...base, claimed: true, startAt: NOW - 10, endAt: NOW - 1, pledged: base.goal }} now={NOW} />,
    );
    expect(screen.getByTestId('claimed-tag')).toBeInTheDocument();
  });

  it('reports over-100% funding without clamping the label', () => {
    render(<CampaignCard record={{ ...base, pledged: 1_500n * 10n ** 18n }} now={NOW} />);
    expect(screen.getByTestId('card-pledged')).toHaveTextContent('150% funded');
    expect(screen.getByTestId('card-progress')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('card-progress')).toHaveAttribute('aria-valuetext', '150% funded');
  });

  it('is selectable by click and exposes selection state', async () => {
    const onSelect = vi.fn();
    render(<CampaignCard record={base} now={NOW} onSelect={onSelect} />);
    const card = screen.getByTestId('campaign-card');
    expect(card).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});

describe('Terminal (status log)', () => {
  beforeEach(() => clearMessages());

  it('shows the empty state first', () => {
    render(<Terminal />);
    expect(screen.getByTestId('terminal')).toHaveAttribute('role', 'log');
    expect(screen.getByTestId('terminal-empty')).toBeInTheDocument();
  });

  it('appends severity-styled lines', () => {
    render(<Terminal />);
    act(() => {
      appendMessage('info', 'reading campaigns from chain…');
      appendMessage('success', 'campaigns synced — 4 total');
      appendMessage('error', 'something failed');
    });
    const lines = screen.getAllByTestId('terminal-line');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent('reading campaigns from chain');
    expect(lines[2]).toHaveClass('text-alertred');
    expect(lines[1]).toHaveClass('text-terminalgreen');
  });
});
