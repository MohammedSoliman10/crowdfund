import { ProgressBar } from '../retro/ProgressBar';
import { deriveStatus, nowSeconds } from '../../lib/status';
import {
  formatCompact,
  formatAmount,
  formatTimingLabel,
  progressPct,
} from '../../lib/format';
import type { CampaignRecord, CampaignStatus } from '../../types';

const STATUS_STYLE: Record<CampaignStatus, string> = {
  upcoming: 'bg-silver text-shadow',
  live: 'bg-teal text-paper',
  successful: 'bg-terminalgreen text-shadow',
  failed: 'bg-alertred text-shadow',
  cancelled: 'bg-bevelDarker text-paper',
};

const STATUS_LABEL: Record<CampaignStatus, string> = {
  upcoming: 'UPCOMING',
  live: 'LIVE',
  successful: 'SUCCESSFUL',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
};

export function statusChipClass(status: CampaignStatus): string {
  return STATUS_STYLE[status];
}

export interface CampaignCardProps {
  record: CampaignRecord;
  selected?: boolean;
  onSelect?: (id: number) => void;
  now?: number;
}

function snippet(description: string): string {
  if (description.length <= 96) return description;
  return `${description.slice(0, 96)}…`;
}

/** Campaign summary card (T032) — pure presentational VM derived from record */
export function CampaignCard({ record, selected = false, onSelect, now }: CampaignCardProps) {
  const at = now ?? nowSeconds();
  const status = deriveStatus(record, at);
  const pct = progressPct(record.pledged, record.goal);
  const timingLabel = formatTimingLabel(record.startAt, record.endAt, at);
  const funded = `${Math.round(pct)}% funded`;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(record.id)}
      aria-pressed={selected}
      data-testid="campaign-card"
      data-campaign-id={record.id}
      data-status={status}
      className={[
        'flex w-full flex-col gap-2 bg-paper p-3 text-left shadow-bevel-out',
        'hover:brightness-[1.03]',
        selected ? 'outline-2 outline-dashed outline-navy outline-offset-2' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate font-display text-lg text-navy" title={record.title} data-testid="card-title">
          {record.title}
        </h3>
        <span
          data-testid="status-chip"
          className={`shrink-0 px-1.5 py-0.5 font-pixel text-sm ${STATUS_STYLE[status]}`}
        >
          {STATUS_LABEL[status]}
          {status === 'successful' && record.claimed ? ' ✓' : ''}
        </span>
      </div>

      <p className="line-clamp-2 text-base leading-snug text-shadow" data-testid="card-snippet">
        {snippet(record.description)}
      </p>

      <ProgressBar pct={pct} valueText={funded} testId="card-progress" />

      <div className="flex items-baseline justify-between gap-2 text-base text-shadow">
        <span data-testid="card-goal" title={`${formatAmount(record.goal)} tokens goal`}>
          Goal {formatCompact(record.goal)}
        </span>
        <span data-testid="card-pledged" title={`${formatAmount(record.pledged)} tokens pledged`}>
          {formatCompact(record.pledged)} pledged · {funded}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 text-base">
        <span data-testid="card-timing" className="text-navy">
          {timingLabel}
        </span>
        {record.claimed && (
          <span data-testid="claimed-tag" className="bg-terminalgreen px-1 text-shadow">
            Funds claimed
          </span>
        )}
      </div>
    </button>
  );
}
