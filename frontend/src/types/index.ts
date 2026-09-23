/** Domain + view-model types (contracts/ui-state-contracts.md §2, data-model.md) */

export type HexAddress = `0x${string}`;

/** On-chain Campaign record (extended with title/description — Clarification Q1) */
export interface CampaignRecord {
  id: number;
  creator: string;
  goal: bigint;
  pledged: bigint;
  startAt: number;
  endAt: number;
  claimed: boolean;
  title: string;
  description: string;
}

/** FR-003 status vocabulary */
export type CampaignStatus = 'upcoming' | 'live' | 'successful' | 'failed' | 'cancelled';

/** FR-001 filter tabs (cancelled campaigns have no tab) */
export type StatusTab = 'all' | 'upcoming' | 'live' | 'successful' | 'failed';

export type DataState = 'loading' | 'ready' | 'error';

export type ActionKind = 'launch' | 'cancel' | 'pledge' | 'unpledge' | 'claim' | 'refund';

export interface ActionAvailability {
  enabled: boolean;
  reason: string | null;
}

/** Wallet session (data-model.md §3, ui-state-contracts §1) */
export type WalletConnectionState = 'disconnected' | 'connecting' | 'connected' | 'no-wallet';

export interface WalletSession {
  connection: WalletConnectionState;
  address?: string;
  chainId?: number;
  networkOk: boolean;
}

export interface ViewerContribution {
  outstanding: bigint;
}

export interface CampaignCardVM {
  id: number;
  title: string;
  descriptionSnippet: string;
  goalLabel: string;
  pledgedLabel: string;
  progressPct: number;
  status: CampaignStatus;
  claimed: boolean;
  timingLabel: string;
}

export interface CampaignDetailVM extends CampaignCardVM {
  description: string;
  creatorAddress: string;
  creatorLabel: string;
  myOutstanding?: string;
  actions: Record<ActionKind, ActionAvailability>;
}

export interface TerminalMessageVM {
  id: number;
  timeLabel: string;
  severity: 'info' | 'success' | 'error';
  text: string;
}

export interface ConnectButtonVM {
  state: WalletConnectionState;
  accountLabel?: string;
  networkLabel?: string;
  networkOk: boolean;
}
