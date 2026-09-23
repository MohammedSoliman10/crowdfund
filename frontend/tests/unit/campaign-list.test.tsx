import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CampaignRecord, CampaignStatus } from '../../src/types';

const mockState = vi.hoisted(() => ({
  current: {
    campaigns: [] as CampaignRecord[],
    dataState: 'loading' as 'loading' | 'ready' | 'error',
    errorMessage: null as string | null,
    refetch: (() => {}) as () => void,
    isFetching: false,
  },
}));

vi.mock('../../src/hooks/useCampaigns', () => ({
  useCampaigns: () => mockState.current,
  REFETCH_INTERVAL_MS: 12_000,
  normalizeCampaign: (id: number, raw: Record<string, unknown>) => ({ id, ...raw }),
}));

vi.mock('../../src/hooks/useChainNow', () => ({
  useChainNow: () => Math.floor(Date.now() / 1000),
  useChainNowOrWall: () => Math.floor(Date.now() / 1000),
}));

import { CampaignListWindow } from '../../src/components/campaigns/CampaignListWindow';

const NOW = Math.floor(Date.now() / 1000);

function campaign(id: number, overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id,
    creator: '0xAbc0000000000000000000000000000000000001',
    goal: 1_000n * 10n ** 18n,
    pledged: 500n * 10n ** 18n,
    startAt: NOW - 10,
    endAt: NOW + 86_400,
    claimed: false,
    title: `Campaign ${id}`,
    description: `Description for campaign ${id}`,
    ...overrides,
  };
}

function statusOf(c: CampaignRecord): CampaignStatus {
  if (NOW < c.startAt) return 'upcoming';
  if (NOW <= c.endAt) return 'live';
  return c.pledged >= c.goal ? 'successful' : 'failed';
}

const noop = () => {};

function renderList(onSelect = noop, onLaunchClick = noop) {
  return render(
    <CampaignListWindow selectedId={null} onSelect={onSelect} onLaunchClick={onLaunchClick} />,
  );
}

beforeEach(() => {
  mockState.current = {
    campaigns: [],
    dataState: 'loading',
    errorMessage: null,
    refetch: noop,
    isFetching: false,
  };
});

describe('CampaignListWindow data states', () => {
  it('shows the loading state', () => {
    renderList();
    expect(screen.getByTestId('list-loading')).toBeInTheDocument();
  });

  it('shows the error state and retries on click', async () => {
    const refetch = vi.fn();
    mockState.current.dataState = 'error';
    mockState.current.errorMessage = 'network';
    mockState.current.refetch = refetch;
    renderList();
    expect(screen.getByTestId('list-error')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('list-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty-catalogue state with a launch shortcut', async () => {
    const onLaunchClick = vi.fn();
    mockState.current.dataState = 'ready';
    renderList(noop, onLaunchClick);
    expect(screen.getByTestId('empty-catalogue')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('empty-launch'));
    expect(onLaunchClick).toHaveBeenCalledTimes(1);
  });

  it('shows the empty-result state when search matches nothing', async () => {
    mockState.current.dataState = 'ready';
    mockState.current.campaigns = [campaign(1, { title: 'Solar Shelters' })];
    renderList();
    await userEvent.type(screen.getByTestId('search-input'), 'zzz');
    expect(screen.getByTestId('empty-result')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-card')).not.toBeInTheDocument();
    // clear search restores the result
    await userEvent.click(screen.getByTestId('clear-search'));
    expect(screen.getByTestId('campaign-card')).toBeInTheDocument();
  });
});

describe('CampaignListWindow list behaviour', () => {
  // Mirrors the read hook contract: newest-first (ids 15…1); id15 is upcoming
  const fifteen = () =>
    Array.from({ length: 15 }, (_, i) => 15 - i).map((id) =>
      campaign(id, id === 15 ? { startAt: NOW + 99_999, endAt: NOW + 199_999 } : {}),
    );

  beforeEach(() => {
    mockState.current.dataState = 'ready';
    mockState.current.campaigns = fifteen();
  });

  it('renders page one (12) then loads the rest', async () => {
    renderList();
    expect(screen.getAllByTestId('campaign-card')).toHaveLength(12);
    expect(screen.getByTestId('list-count')).toHaveTextContent('showing 12 of 15');
    await userEvent.click(screen.getByTestId('load-more'));
    expect(screen.getAllByTestId('campaign-card')).toHaveLength(15);
    expect(screen.queryByTestId('load-more')).not.toBeInTheDocument();
  });

  it('filters by status tab (upcoming is id15)', async () => {
    renderList();
    await userEvent.click(screen.getByTestId('filter-upcoming'));
    const cards = screen.getAllByTestId('campaign-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('data-status', 'upcoming');
    expect(cards[0]).toHaveAttribute('data-campaign-id', '15');
  });

  it('filters by title search', async () => {
    renderList();
    await userEvent.type(screen.getByTestId('search-input'), 'campaign 14');
    expect(screen.getAllByTestId('campaign-card')).toHaveLength(1);
    expect(screen.getByTestId('card-title')).toHaveTextContent('Campaign 14');
  });

  it('reports selection to the parent', async () => {
    const onSelect = vi.fn();
    renderList(onSelect);
    await userEvent.click(screen.getAllByTestId('campaign-card')[0]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(typeof onSelect.mock.calls[0][0]).toBe('number');
  });

  it('newest-first order comes from the read hook (ids 15…1)', () => {
    renderList();
    const ids = screen
      .getAllByTestId('campaign-card')
      .map((el) => Number(el.getAttribute('data-campaign-id')));
    const statuses = screen
      .getAllByTestId('campaign-card')
      .map((el) => statusOf(mockState.current.campaigns.find((c) => c.id === Number(el.getAttribute('data-campaign-id')))!));
    expect(ids[0]).toBe(15);
    expect(statuses.every((s) => s === 'live' || s === 'upcoming')).toBe(true);
  });
});
