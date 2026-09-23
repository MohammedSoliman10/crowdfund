import { useEffect, useRef } from 'react';
import { Button } from '../retro/Button';
import { useWalletSession } from '../../hooks/useWalletSession';
import { shortenAddress } from '../../lib/format';
import { chainLabel } from '../../config/chains';
import { logAction, logError, logSuccess } from '../../stores/terminalStore';
import { toUserMessage } from '../../lib/errors';
import { LOG } from '../../lib/logText';

/** Header wallet control: connect / account chip / disconnect / network warning */
export function ConnectButton() {
  const { session, connect, disconnect, isPending, error } = useWalletSession();
  const lastLoggedAddress = useRef<string | null>(null);

  // Terminal log for connection transitions (FR-018: every action outcome logged)
  useEffect(() => {
    if (session.connection === 'connected' && session.address) {
      if (lastLoggedAddress.current !== session.address) {
        lastLoggedAddress.current = session.address;
        logSuccess(`${LOG.CONNECTED_PREFIX} ${shortenAddress(session.address)}`);
      }
    } else if (session.connection === 'disconnected' && lastLoggedAddress.current !== null) {
      lastLoggedAddress.current = null;
      logAction(LOG.DISCONNECTED);
    }
  }, [session.connection, session.address]);

  useEffect(() => {
    if (error) logError(toUserMessage(error));
  }, [error]);

  if (session.connection === 'no-wallet') {
    return (
      <div className="flex items-center gap-3">
        <span data-testid="no-wallet-notice" className="text-base text-shadow">
          No wallet detected — install an injected wallet (e.g. MetaMask) to fund campaigns.
        </span>
        <Button
          disabled
          reason="No injected wallet detected in this browser."
          testId="connect-wallet"
        >
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (session.connection === 'connected' && session.address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {!session.networkOk && (
          <span
            role="alert"
            data-testid="network-warning"
            className="bg-alertyellow px-2 py-0.5 text-base text-shadow"
          >
            {LOG.WRONG_NETWORK} — switch to Anvil (Local) or Sepolia to act
          </span>
        )}
        <span
          data-testid="account-chip"
          title={session.address}
          className="bg-paper px-2 py-0.5 text-base shadow-bevel-in-sm"
        >
          {shortenAddress(session.address)}
        </span>
        <span
          data-testid="network-chip"
          className={`px-2 py-0.5 text-base ${session.networkOk ? 'bg-teal text-paper' : 'bg-alertyellow text-shadow'}`}
        >
          {chainLabel(session.chainId)}
        </span>
        <Button onClick={disconnect} testId="disconnect-wallet">
          Disconnect
        </Button>
      </div>
    );
  }

  // disconnected | connecting
  const connecting = session.connection === 'connecting' || isPending;
  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={connect}
        disabled={connecting}
        reason="Waiting for approval inside your wallet…"
        testId="connect-wallet"
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </Button>
    </div>
  );
}
