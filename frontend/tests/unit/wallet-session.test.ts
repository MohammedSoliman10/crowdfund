import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * T027 — wallet session state machine:
 * disconnected / connecting / connected / no-wallet + wrong-network gating.
 */
const wagmi = vi.hoisted(() => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
  injected: vi.fn(() => ({ id: 'injected' })),
}));

vi.mock('wagmi', () => ({
  useAccount: wagmi.useAccount,
  useConnect: wagmi.useConnect,
  useDisconnect: wagmi.useDisconnect,
}));
vi.mock('wagmi/connectors', () => ({ injected: wagmi.injected }));

import { hasInjectedWallet, useWalletSession } from '../../src/hooks/useWalletSession';

type EthereumWindow = Window & { ethereum?: unknown };

function primeAccount(partial: {
  address?: `0x${string}`;
  isConnected: boolean;
  chainId?: number;
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
}) {
  wagmi.useAccount.mockReturnValue({
    address: partial.address,
    isConnected: partial.isConnected,
    chainId: partial.chainId,
    status: partial.status,
  });
}

function primeConnect(pending = false) {
  wagmi.useConnect.mockReturnValue({
    connect: vi.fn(),
    isPending: pending,
    error: null,
    reset: vi.fn(),
  });
  wagmi.useDisconnect.mockReturnValue({ disconnect: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  primeConnect();
  (window as EthereumWindow).ethereum = { isFake: true };
});

describe('hasInjectedWallet', () => {
  it('is false without window.ethereum and true with it', () => {
    delete (window as EthereumWindow).ethereum;
    expect(hasInjectedWallet()).toBe(false);
    (window as EthereumWindow).ethereum = {};
    expect(hasInjectedWallet()).toBe(true);
  });
});

describe('useWalletSession', () => {
  it('reports no-wallet regardless of connector state when no provider exists', () => {
    delete (window as EthereumWindow).ethereum;
    primeAccount({ isConnected: true, status: 'connected', chainId: 31337 });

    const { result } = renderHook(() => useWalletSession());
    expect(result.current.session.connection).toBe('no-wallet');
    expect(result.current.session.networkOk).toBe(false);

    act(() => result.current.connect());
    expect(wagmi.useConnect().connect).not.toHaveBeenCalled();
  });

  it('reports disconnected when a provider exists but no session', () => {
    primeAccount({ isConnected: false, status: 'disconnected' });
    const { result } = renderHook(() => useWalletSession());
    expect(result.current.session.connection).toBe('disconnected');
    expect(result.current.session.address).toBeUndefined();
  });

  it('reports connecting while the connector is pending', () => {
    primeAccount({ isConnected: false, status: 'connecting' });
    primeConnect(true);
    const { result } = renderHook(() => useWalletSession());
    expect(result.current.session.connection).toBe('connecting');
    expect(result.current.isPending).toBe(true);
  });

  it('reports connected + networkOk on the supported dev chain', () => {
    primeAccount({
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      isConnected: true,
      chainId: 31337,
      status: 'connected',
    });
    const { result } = renderHook(() => useWalletSession());
    expect(result.current.session.connection).toBe('connected');
    expect(result.current.session.chainId).toBe(31337);
    expect(result.current.session.networkOk).toBe(true);
  });

  it('keeps the session connected but flags networkOk=false on an unsupported chain', () => {
    primeAccount({
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      isConnected: true,
      chainId: 1,
      status: 'connected',
    });
    const { result } = renderHook(() => useWalletSession());
    expect(result.current.session.connection).toBe('connected');
    expect(result.current.session.chainId).toBe(1);
    expect(result.current.session.networkOk).toBe(false);
  });

  it('startConnect resets then connects the injected connector; startDisconnect disconnects', () => {
    primeAccount({ isConnected: false, status: 'disconnected' });
    const connect = vi.fn();
    const reset = vi.fn();
    const disconnect = vi.fn();
    wagmi.useConnect.mockReturnValue({ connect, isPending: false, error: null, reset });
    wagmi.useDisconnect.mockReturnValue({ disconnect });

    const { result } = renderHook(() => useWalletSession());
    act(() => result.current.connect());
    expect(reset).toHaveBeenCalled();
    expect(connect).toHaveBeenCalledWith({ connector: { id: 'injected' } });

    act(() => result.current.disconnect());
    expect(disconnect).toHaveBeenCalled();
  });
});
