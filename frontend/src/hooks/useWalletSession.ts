import { useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { isSupportedChain } from '../config/chains';
import type { WalletConnectionState, WalletSession } from '../types';

export function hasInjectedWallet(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as Window & { ethereum?: unknown }).ethereum !== undefined
  );
}

export interface UseWalletSessionResult {
  session: WalletSession;
  connect: () => void;
  disconnect: () => void;
  isPending: boolean;
  error: unknown;
}

/**
 * Maps wagmi account state → the four-state session model
 * (data-model.md §3 wallet state machine; Clarification Q2: injected only).
 */
export function useWalletSession(): UseWalletSessionResult {
  const { address, isConnected, chainId, status } = useAccount();
  const { connect, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();

  let connection: WalletConnectionState;
  if (!hasInjectedWallet()) connection = 'no-wallet';
  else if (status === 'connecting' || isPending) connection = 'connecting';
  else if (isConnected && address) connection = 'connected';
  else connection = 'disconnected';

  const session: WalletSession = {
    connection,
    address,
    chainId,
    networkOk: connection === 'connected' && isSupportedChain(chainId),
  };

  const startConnect = useCallback(() => {
    if (!hasInjectedWallet()) return;
    reset();
    connect({ connector: injected() });
  }, [connect, reset]);

  const startDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return { session, connect: startConnect, disconnect: startDisconnect, isPending, error };
}
