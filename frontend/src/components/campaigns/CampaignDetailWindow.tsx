import { useMemo, useState } from 'react';
import { Window } from '../retro/Window';
import { Button } from '../retro/Button';
import { Dialog } from '../retro/Dialog';
import { ProgressBar } from '../retro/ProgressBar';
import { PledgeForm } from '../actions/PledgeForm';
import { UnpledgeControls } from '../actions/UnpledgeControls';
import { useCampaign } from '../../hooks/useCampaign';
import { useChainNowOrWall } from '../../hooks/useChainNow';
import { useWalletSession } from '../../hooks/useWalletSession';
import { useCancel, useClaim, useRefund } from '../../hooks/useCampaignActions';
import { getActionAvailability } from '../../lib/actions';
import { deriveStatus } from '../../lib/status';
import {
  formatAmount,
  formatCompact,
  formatDateTime,
  formatTimingLabel,
  progressPct,
} from '../../lib/format';
import { shortenAddress } from '../../lib/format';
import { statusChipClass } from './CampaignCard';

export interface CampaignDetailWindowProps {
  id: number;
  onClose: () => void;
}

function statusLabel(status: string): string {
  return status.toUpperCase();
}

/** US1 detail surface + US2/US3 action panel (availability matrix drives every control) */
export function CampaignDetailWindow({ id, onClose }: CampaignDetailWindowProps) {
  const { record, outstanding, dataState, refetch } = useCampaign(id);
  const wallet = useWalletSession();
  const cancelAction = useCancel();
  const claimAction = useClaim();
  const refundAction = useRefund();

  // Status, timing labels, and action gating derive from chain time
  const now = useChainNowOrWall();
  const [cancelOpen, setCancelOpen] = useState(false);

  const availability = useMemo(() => {
    if (!record) return null;
    return getActionAvailability({
      campaign: record,
      session: wallet.session,
      contribution: { outstanding: outstanding ?? 0n },
      now,
    });
  }, [record, wallet.session, outstanding, now]);

  const body = (() => {
    if (dataState === 'loading') {
      return (
        <p data-testid="detail-loading" className="bg-paper p-4 text-center text-shadow shadow-bevel-in">
          reading campaign from chain…
        </p>
      );
    }
    if (dataState === 'error' || !record || !availability) {
      return (
        <div className="flex flex-col items-center gap-3 bg-paper p-4 shadow-bevel-in">
          <p role="alert" data-testid="detail-error" className="text-center text-shadow">
            Couldn’t read this campaign — it may not exist on this network.
          </p>
          <Button onClick={refetch} testId="detail-retry">
            Retry
          </Button>
        </div>
      );
    }

    const status = deriveStatus(record, now);
    const pct = progressPct(record.pledged, record.goal);
    const funded = `${Math.round(pct)}% funded`;

    if (status === 'cancelled') {
      return (
        <div className="flex flex-col items-center gap-3 bg-paper p-6 text-center shadow-bevel-in">
          <p data-testid="detail-cancelled" className="font-display text-lg text-shadow">
            This campaign was cancelled before it started.
          </p>
          <p className="text-base text-shadow">Nothing was funded — pick another campaign from the list.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4" data-testid="detail-body">
        {/* identity */}
        <div className="flex flex-col gap-2 bg-paper p-3 shadow-bevel-in">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-display text-xl text-navy" data-testid="detail-title">
              {record.title}
            </h3>
            <span
              data-testid="status-chip"
              className={`px-1.5 py-0.5 font-pixel text-sm ${statusChipClass(status)}`}
            >
              {statusLabel(status)}
              {status === 'successful' && record.claimed ? ' ✓' : ''}
            </span>
          </div>
          <p className="text-base leading-relaxed text-shadow" data-testid="detail-description">
            {record.description}
          </p>
          <p className="text-base text-shadow" data-testid="detail-creator">
            Creator:{' '}
            <span title={record.creator} className="bg-silver px-1 shadow-bevel-in-sm">
              {shortenAddress(record.creator)}
            </span>
          </p>
        </div>

        {/* numbers */}
        <div className="flex flex-col gap-2 bg-paper p-3 shadow-bevel-in">
          <ProgressBar pct={pct} valueText={funded} testId="detail-progress" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-base text-shadow sm:grid-cols-2">
            <span data-testid="detail-goal" title={`${formatAmount(record.goal)} CFT goal`}>
              Goal: {formatCompact(record.goal)} CFT
            </span>
            <span data-testid="detail-pledged" title={`${formatAmount(record.pledged)} CFT pledged`}>
              Pledged: {formatCompact(record.pledged)} CFT · {funded}
            </span>
            <span data-testid="detail-start">Starts: {formatDateTime(record.startAt)}</span>
            <span data-testid="detail-end">Ends: {formatDateTime(record.endAt)}</span>
            <span data-testid="detail-timing" className="text-navy">
              {formatTimingLabel(record.startAt, record.endAt, now)}
            </span>
            {wallet.session.connection === 'connected' && outstanding !== null && (
              <span data-testid="detail-stake" title={`${formatAmount(outstanding)} CFT`}>
                Your stake: {formatAmount(outstanding)} CFT
              </span>
            )}
          </div>
        </div>

        {/* action panel */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="flex flex-col gap-3 bg-paper p-3 shadow-bevel-in" aria-label="Backer actions">
            <h4 className="font-display text-base text-navy">Backer actions</h4>
            <PledgeForm campaignId={record.id} availability={availability.pledge} />
            <hr className="dashed-rule" aria-hidden />
            <UnpledgeControls
              campaignId={record.id}
              outstanding={outstanding ?? 0n}
              availability={availability.unpledge}
            />
            <div className="flex flex-col gap-1">
              <Button
                disabled={!availability.refund.enabled}
                reason={availability.refund.reason ?? undefined}
                onClick={() => void refundAction.run(record.id)}
                testId="refund-button"
                variant="wide"
              >
                Claim Refund
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-3 bg-paper p-3 shadow-bevel-in" aria-label="Creator actions">
            <h4 className="font-display text-base text-navy">Creator actions</h4>
            <p className="text-base text-shadow">
              You are {wallet.session.address?.toLowerCase() === record.creator.toLowerCase() ? '' : 'not '}
              this campaign’s creator.
            </p>
            <Button
              disabled={!availability.claim.enabled}
              reason={availability.claim.reason ?? undefined}
              onClick={() => void claimAction.run(record.id)}
              testId="claim-button"
              variant="wide"
            >
              Claim Funds
            </Button>
            <Button
              disabled={!availability.cancel.enabled}
              reason={availability.cancel.reason ?? undefined}
              onClick={() => setCancelOpen(true)}
              testId="cancel-button"
              variant="wide"
            >
              Cancel Campaign
            </Button>
            <p className="text-base text-shadow">
              Claims unlock only after a successful campaign ends. Cancel only works before the start time.
            </p>
          </section>
        </div>

        <Dialog
          open={cancelOpen}
          title="Cancel this campaign?"
          onClose={() => setCancelOpen(false)}
          testId="cancel-dialog"
        >
          <p className="text-base text-shadow" data-testid="cancel-warning">
            Cancelling removes the campaign for everyone. Only campaigns that haven’t started can be
            cancelled. This cannot be undone.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void cancelAction.run(record.id).then((result) => {
                  setCancelOpen(false);
                  if (result.ok) onClose();
                });
              }}
              disabled={cancelAction.isPending}
              reason="Waiting for wallet confirmation…"
              testId="cancel-confirm"
            >
              Yes, cancel it
            </Button>
            <Button onClick={() => setCancelOpen(false)} testId="cancel-deny">
              Keep campaign
            </Button>
          </div>
        </Dialog>
      </div>
    );
  })();

  return (
    <Window
      title={record ? `Campaign #${record.id}` : `Campaign #${id}`}
      onClose={onClose}
      testId="campaign-detail-window"
      footer={
        <span className="text-base text-shadow">
          read directly from CrowdFund on-chain — no backend
        </span>
      }
    >
      <div className="dashed-rule" aria-hidden />
      {body}
    </Window>
  );
}
