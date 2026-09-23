/**
 * Stable status-log vocabulary (FR-018) — shared by UI writers and e2e
 * assertions so wording can't drift between implementation and tests.
 */
export const LOG = {
  // wallet
  CONNECTED_PREFIX: 'wallet connected —',
  DISCONNECTED: 'wallet disconnected',
  WRONG_NETWORK: 'wrong network',

  // campaign reads
  READING: 'reading campaigns from chain…',
  SYNCED_PREFIX: 'campaigns synced —',
  READ_ERROR: 'couldn’t reach the network — campaign list unavailable',
  RETRY: 'retrying campaign read…',

  // writes (sent → confirmed)
  LAUNCH_SENT: 'launch — waiting for wallet confirmation…',
  LAUNCH_OK: 'launch confirmed — campaign created',
  PLEDGE_SENT: 'pledge — waiting for wallet confirmation…',
  PLEDGE_OK: 'pledge confirmed — funds committed',
  UNPLEDGE_SENT: 'unpledge — waiting for wallet confirmation…',
  UNPLEDGE_OK: 'unpledge confirmed — funds returned',
  CANCEL_SENT: 'cancel — waiting for wallet confirmation…',
  CANCEL_OK: 'cancel confirmed — campaign removed',
  CLAIM_SENT: 'claim — waiting for wallet confirmation…',
  CLAIM_OK: 'claim confirmed — funds claimed by creator',
  REFUND_SENT: 'refund — waiting for wallet confirmation…',
  REFUND_OK: 'refund confirmed — contribution returned',
  APPROVE_SENT: 'approve — waiting for wallet confirmation…',
  APPROVE_OK: 'approval confirmed — token ready for pledges',

  // filter/search interactions
  FILTERED_PREFIX: 'filter →',
  SEARCH_PREFIX: 'search →',
  PAGED_PREFIX: 'page →',
} as const;
