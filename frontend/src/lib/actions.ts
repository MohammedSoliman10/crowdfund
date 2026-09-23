/**
 * Pure action-eligibility matrix (data-model.md §4) — single source for
 * enable/disable state of every write action across card, detail, and forms.
 */
import { M } from './errors';
import { deriveStatus, hasEnded, nowSeconds } from './status';
import type {
  ActionAvailability,
  ActionKind,
  CampaignRecord,
  ViewerContribution,
  WalletSession,
} from '../types';

export type { ActionKind };

export interface EligibilityInput {
  campaign: CampaignRecord | null; // null for 'launch' (no campaign yet)
  session: WalletSession;
  contribution: ViewerContribution | null;
  now?: number;
}

const ENABLED: ActionAvailability = { enabled: true, reason: null };

function blocked(reason: string): ActionAvailability {
  return { enabled: false, reason };
}

/** Gate shared by every action: wallet session + correct network (FR-005, FR-015) */
function sessionGate(session: WalletSession): ActionAvailability | null {
  if (session.connection === 'no-wallet') return blocked('No wallet detected — install an injected wallet to continue.');
  if (session.connection === 'connecting') return blocked('Connection in progress — one moment.');
  if (session.connection !== 'connected' || !session.address) return blocked(M.CONNECT_REQUIRED);
  if (!session.networkOk) return blocked(M.WRONG_CHAIN);
  return null;
}

export function getActionAvailability(input: EligibilityInput): Record<ActionKind, ActionAvailability> {
  const { session, contribution } = input;
  const now = input.now ?? nowSeconds();
  const gate = sessionGate(session);

  // ---------- launch ----------
  let launch: ActionAvailability = gate ?? ENABLED;
  if (launch.enabled && input.campaign === null) launch = ENABLED;

  if (!input.campaign) {
    return {
      launch,
      cancel: blocked('Open a campaign first.'),
      pledge: blocked('Open a campaign first.'),
      unpledge: blocked('Open a campaign first.'),
      claim: blocked('Open a campaign first.'),
      refund: blocked('Open a campaign first.'),
    };
  }

  const c = input.campaign;
  const status = deriveStatus(c, now);
  const isCreator = !!session.address && c.creator.toLowerCase() === session.address.toLowerCase();
  const outstanding = contribution?.outstanding ?? 0n;

  const needsCampaignSession = gate; // actions on a campaign still need wallet+network

  // ---------- cancel ----------
  let cancel: ActionAvailability = needsCampaignSession ?? ENABLED;
  if (cancel.enabled && !isCreator) cancel = blocked(M.NOT_CREATOR);
  if (cancel.enabled && status !== 'upcoming') cancel = blocked(M.ALREADY_STARTED);

  // ---------- pledge ----------
  let pledge: ActionAvailability = needsCampaignSession ?? ENABLED;
  if (pledge.enabled && status === 'upcoming') pledge = blocked(M.NOT_STARTED);
  if (pledge.enabled && status !== 'upcoming' && status !== 'live') pledge = blocked(M.ENDED);

  // ---------- unpledge ----------
  let unpledge: ActionAvailability = needsCampaignSession ?? ENABLED;
  if (unpledge.enabled && hasEnded(status)) unpledge = blocked(M.ENDED);
  if (unpledge.enabled && status === 'cancelled') unpledge = blocked(M.ENDED);
  if (unpledge.enabled && outstanding === 0n) unpledge = blocked(M.NOTHING_TO_WITHDRAW);

  // ---------- claim ----------
  let claim: ActionAvailability = needsCampaignSession ?? ENABLED;
  if (claim.enabled && !isCreator) claim = blocked(M.NOT_CREATOR);
  if (claim.enabled && (status === 'upcoming' || status === 'live')) claim = blocked(M.NOT_ENDED);
  if (claim.enabled && status === 'failed') claim = blocked(M.GOAL_MISSED);
  if (claim.enabled && status === 'cancelled') claim = blocked(M.ENDED);
  if (claim.enabled && status === 'successful' && c.claimed) claim = blocked(M.CLAIMED);

  // ---------- refund ----------
  let refund: ActionAvailability = needsCampaignSession ?? ENABLED;
  if (refund.enabled && (status === 'upcoming' || status === 'live')) refund = blocked(M.NOT_ENDED);
  if (refund.enabled && status === 'successful') refund = blocked(M.GOAL_MET);
  if (refund.enabled && status === 'cancelled') refund = blocked(M.ENDED);
  if (refund.enabled && status === 'failed' && outstanding === 0n) refund = blocked(M.NOTHING_TO_REFUND);

  return { launch, cancel, pledge, unpledge, claim, refund };
}
