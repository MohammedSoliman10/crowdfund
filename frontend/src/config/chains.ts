import { sepolia } from 'viem/chains';

/** Local development chain — anvil default (Clarification Q4: local while building) */
export const anvilChain = {
  id: 31337,
  name: 'Anvil (Local)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
  testnet: true,
} as const;

/** Public testnet — live target (Clarification Q4) */
export const liveChain = sepolia;

export const SUPPORTED_CHAINS = [anvilChain, liveChain] as const;

export const SUPPORTED_CHAIN_IDS: readonly number[] = SUPPORTED_CHAINS.map((c) => c.id);

export const DEV_CHAIN_ID = anvilChain.id;
export const LIVE_CHAIN_ID = liveChain.id;

export function isSupportedChain(chainId: number | undefined): boolean {
  return chainId !== undefined && SUPPORTED_CHAIN_IDS.includes(chainId);
}

export function chainLabel(chainId: number | undefined): string {
  if (chainId === undefined) return 'No network';
  if (chainId === DEV_CHAIN_ID) return 'Anvil (Local)';
  if (chainId === LIVE_CHAIN_ID) return 'Sepolia';
  return `Chain #${chainId}`;
}
