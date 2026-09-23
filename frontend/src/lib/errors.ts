/**
 * Two-layer error strategy (research R9):
 * Layer 1 = pre-flight validation (forms/validate.ts) — never sends a tx for user mistakes.
 * Layer 2 = this file — maps actual reverts/unknown errors to plain language.
 * Raw revert strings must never reach the UI (FR-013, SC-004).
 */

/** Canonical plain-language messages, shared with actions.ts so wording stays consistent */
export const M = {
  START_IN_PAST: 'Start time can’t be in the past.',
  END_BEFORE_START: 'End time must be after the start time.',
  MAX_DURATION: 'Campaigns can run at most 90 days.',
  GOAL_ZERO: 'Funding goal must be greater than zero.',
  TITLE_EMPTY: 'Give your campaign a title.',
  DESC_EMPTY: 'Add a description so backers know what they’re funding.',
  TITLE_LONG: 'Title must be 80 characters or fewer.',
  DESC_LONG: 'Description must be 500 characters or fewer.',
  AMOUNT_INVALID: 'Enter a valid token amount.',
  AMOUNT_ZERO: 'Amount must be greater than zero.',

  NOT_CREATOR: 'Only the campaign creator can do that.',
  ALREADY_STARTED: 'This campaign already started — it can’t be cancelled.',
  NOT_STARTED: 'This campaign hasn’t started yet.',
  ENDED: 'This campaign has ended.',
  NOT_ENDED: 'This campaign hasn’t ended yet.',
  INSUFFICIENT_PLEDGE: 'You can’t withdraw more than you’ve pledged.',
  NOTHING_TO_WITHDRAW: 'You have nothing to withdraw in this campaign.',
  NOTHING_TO_REFUND: 'You have nothing to refund in this campaign.',
  GOAL_MISSED: 'The goal wasn’t reached — claim a refund instead.',
  GOAL_MET: 'The goal was reached — refunds aren’t available.',
  CLAIMED: 'These funds have already been claimed.',

  TRANSFER_FAILED: 'The token transfer failed — check your balance and approval.',
  ALLOWANCE: 'Approve the pledge token for this amount first.',
  BALANCE: 'You don’t have enough pledge tokens.',
  REJECTED: 'You rejected the request in your wallet — nothing was sent.',
  WRONG_CHAIN: 'Your wallet is on the wrong network — switch to continue.',
  CONNECT_REQUIRED: 'Connect your wallet to continue.',
  NOT_DEPLOYED: 'Contracts aren’t configured on this network yet.',
  GENERIC: 'Something went wrong — the action didn’t complete.',
} as const;

/** Contract revert text (lowercased) → plain-language message */
const REVERT_MAP: ReadonlyArray<readonly [string, string]> = [
  ['start at < now', M.START_IN_PAST],
  ['end at < start at', M.END_BEFORE_START],
  ['end at > max duration', M.MAX_DURATION],
  ['goal = 0', M.GOAL_ZERO],
  ['title empty', M.TITLE_EMPTY],
  ['title too long', M.TITLE_LONG],
  ['description empty', M.DESC_EMPTY],
  ['description too long', M.DESC_LONG],
  ['not creator', M.NOT_CREATOR],
  ['already started', M.ALREADY_STARTED],
  ['not started', M.NOT_STARTED],
  // "not ended" must precede "ended" — substring order matters
  ['not ended', M.NOT_ENDED],
  ['ended', M.ENDED],
  ['insufficient pledge', M.INSUFFICIENT_PLEDGE],
  ['pledged < goal', M.GOAL_MISSED],
  ['pledged >= goal', M.GOAL_MET],
  ['claimed', M.CLAIMED],
  ['transfer failed', M.TRANSFER_FAILED],
  // ERC20 (OZ revert strings + custom errors rendered by viem)
  ['insufficient allowance', M.ALLOWANCE],
  ['erc20insufficientallowance', M.ALLOWANCE],
  ['insufficient balance', M.BALANCE],
  ['erc20insufficientbalance', M.BALANCE],
];

interface ErrorLike {
  code?: number | string;
  message?: string;
  shortMessage?: string;
  details?: string;
  cause?: unknown;
}

/** Flatten an error chain into searchable text */
function collectText(err: unknown, depth = 0): string {
  if (err === null || err === undefined || depth > 6) return '';
  const e = err as ErrorLike;
  const parts = [e.shortMessage, e.message, e.details].filter(Boolean) as string[];
  const cause = e.cause !== undefined ? collectText(e.cause, depth + 1) : '';
  return `${parts.join(' | ')} | ${cause}`;
}

function hasRejectionCode(err: unknown): boolean {
  const e = err as ErrorLike | null;
  if (!e) return false;
  return e.code === 4001 || e.code === 'ACTION_REJECTED';
}

/** Map any thrown value to a plain-language, user-safe message */
export function toUserMessage(err: unknown): string {
  if (hasRejectionCode(err)) return M.REJECTED;

  const text = collectText(err).toLowerCase();

  if (!text.trim()) return M.GENERIC;
  if (text.includes('user rejected') || text.includes('user denied')) return M.REJECTED;
  if (text.includes('wrong chain') || text.includes('chain mismatch')) return M.WRONG_CHAIN;

  for (const [pattern, message] of REVERT_MAP) {
    if (text.includes(pattern)) return message;
  }

  return M.GENERIC;
}

export function isRejection(err: unknown): boolean {
  if (hasRejectionCode(err)) return true;
  const text = collectText(err).toLowerCase();
  return text.includes('user rejected') || text.includes('user denied');
}
