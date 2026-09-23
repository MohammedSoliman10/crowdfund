import { useBlock, useChainId } from 'wagmi';
import { nowSeconds } from '../lib/status';

/**
 * Current chain time in seconds (block.timestamp), or null until the first
 * block read resolves. Status derivation + launch validation must compare
 * against chain time — the contract requires `startAt >= block.timestamp`,
 * and local dev chains may be warped away from wall clock.
 */
export function useChainNow(): number | null {
  const chainId = useChainId();
  const { data } = useBlock({
    chainId,
    query: { staleTime: 3_000, refetchInterval: 10_000 },
  });
  return data ? Number(data.timestamp) : null;
}

/** Chain time with a wall-clock fallback for first paint */
export function useChainNowOrWall(): number {
  return useChainNow() ?? nowSeconds();
}
