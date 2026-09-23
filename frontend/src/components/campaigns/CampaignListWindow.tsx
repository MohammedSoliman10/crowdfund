import { useMemo, useState } from 'react';
import { Window } from '../retro/Window';
import { Button } from '../retro/Button';
import { TextInput } from '../retro/TextInput';
import { CampaignCard } from './CampaignCard';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useChainNowOrWall } from '../../hooks/useChainNow';
import { deriveStatus } from '../../lib/status';
import { logAction } from '../../stores/terminalStore';
import { LOG } from '../../lib/logText';
import type { StatusTab } from '../../types';

const TABS: ReadonlyArray<{ id: StatusTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'live', label: 'Live' },
  { id: 'successful', label: 'Successful' },
  { id: 'failed', label: 'Failed' },
];

export const PAGE_SIZE = 12;

export interface CampaignListWindowProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onLaunchClick: () => void;
}

/** FR-001 list surface: tabs + title search + load-more, with all four data states */
export function CampaignListWindow({ selectedId, onSelect, onLaunchClick }: CampaignListWindowProps) {
  const { campaigns, dataState, refetch } = useCampaigns();
  const [tab, setTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Status + timing labels derive from chain time (block.timestamp), not wall clock
  const now = useChainNowOrWall();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const status = deriveStatus(campaign, now);
      if (tab !== 'all' && status !== tab) return false;
      if (q && !campaign.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [campaigns, tab, query, now]);

  const visible = filtered.slice(0, visibleCount);

  const changeTab = (next: StatusTab) => {
    setTab(next);
    setVisibleCount(PAGE_SIZE);
    logAction(`${LOG.FILTERED_PREFIX} ${next}`);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);
    if (next.trim()) logAction(`${LOG.SEARCH_PREFIX} “${next.trim()}”`);
  };

  const retry = () => {
    logAction(LOG.RETRY);
    refetch();
  };

  const body = (() => {
    if (dataState === 'loading') {
      return (
        <p data-testid="list-loading" className="bg-paper p-4 text-center text-shadow shadow-bevel-in">
          reading campaigns from chain…
        </p>
      );
    }
    if (dataState === 'error') {
      return (
        <div className="flex flex-col items-center gap-3 bg-paper p-4 shadow-bevel-in">
          <p role="alert" data-testid="list-error" className="text-center text-shadow">
            Couldn’t reach the network — campaign list unavailable.
            <br />
            (Contracts may not be configured on this network.)
          </p>
          <Button onClick={retry} testId="list-retry">
            Retry
          </Button>
        </div>
      );
    }
    if (campaigns.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 bg-paper p-6 text-center shadow-bevel-in">
          <p data-testid="empty-catalogue" className="text-shadow">
            No campaigns yet — be the first to launch one.
          </p>
          <Button onClick={onLaunchClick} testId="empty-launch">
            Launch a Campaign
          </Button>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 bg-paper p-6 text-center shadow-bevel-in">
          <p data-testid="empty-result" className="text-shadow">
            No campaigns match {query.trim() ? `“${query.trim()}”` : 'this filter'}
            {tab !== 'all' ? ` in ${tab}` : ''}.
          </p>
          {query.trim() && (
            <Button onClick={() => changeQuery('')} testId="clear-search">
              Clear search
            </Button>
          )}
        </div>
      );
    }
    return (
      <ul className="grid list-none grid-cols-1 gap-3 p-0 xl:grid-cols-2" data-testid="campaign-list">
        {visible.map((campaign) => (
          <li key={campaign.id}>
            <CampaignCard
              record={campaign}
              now={now}
              selected={selectedId === campaign.id}
              onSelect={onSelect}
            />
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <Window
      title="Campaigns"
      testId="campaign-list-window"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2" data-testid="list-footer">
          <span className="text-base text-shadow" data-testid="list-count">
            showing {visible.length} of {filtered.length} ({campaigns.length} on chain)
          </span>
          {visible.length < filtered.length && (
            <Button
              onClick={() => {
                setVisibleCount((count) => count + PAGE_SIZE);
                logAction(`${LOG.PAGED_PREFIX} +${PAGE_SIZE}`);
              }}
              testId="load-more"
            >
              Load more ({filtered.length - visible.length} remaining)
            </Button>
          )}
        </div>
      }
    >
      <div className="dashed-rule" aria-hidden />

      {/* Status filter tabs (Clarification Q3) */}
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by status">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => changeTab(t.id)}
            data-testid={`filter-${t.id}`}
            className={[
              'px-3 py-1 text-base shadow-bevel-out-sm',
              tab === t.id ? 'bg-navy text-paper' : 'bg-silver text-shadow',
              'active:shadow-bevel-in-sm',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TextInput
        label="Search by title"
        type="search"
        value={query}
        onChange={changeQuery}
        placeholder="type a title…"
        testId="search-input"
      />

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base text-shadow">
          {tab === 'all' ? 'All campaigns' : `${tab} campaigns`}
        </h3>
        <Button onClick={onLaunchClick} testId="launch-open">
          Launch Campaign
        </Button>
      </div>

      {body}
    </Window>
  );
}
