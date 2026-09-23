import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { crowdFundAbi } from '../abis';
import { addressesFor } from '../config/contracts';
import { deriveStatus, nowSeconds } from '../lib/status';
import { normalizeCampaign } from './useCampaigns';
import type { CampaignRecord } from '../types';

export interface UseCampaignResult {
  record: CampaignRecord | null;
  /** Viewer's outstanding contribution (null without a wallet session) */
  outstanding: bigint | null;
  dataState: 'loading' | 'ready' | 'error';
  refetch: () => void;
}

/** Detail-window read: one campaign + viewer pledge stake (T035) */
export function useCampaign(id: number | null): UseCampaignResult {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const addresses = addressesFor(chainId);

  const query = useQuery({
    queryKey: ['campaign', chainId, id, address ?? 'none'],
    enabled: !!addresses && !!publicClient && id !== null,
    staleTime: 5_000,
    queryFn: async () => {
      const client = publicClient!;
      const contract = addresses!.crowdFund;

      const raw = await client.readContract({
        address: contract,
        abi: crowdFundAbi,
        functionName: 'campaigns',
        args: [BigInt(id!)],
      });
      const record = normalizeCampaign(id!, raw);

      let outstanding: bigint | null = null;
      if (isConnected && address && deriveStatus(record, nowSeconds()) !== 'cancelled') {
        const stake = (await client.readContract({
          address: contract,
          abi: crowdFundAbi,
          functionName: 'pledgedAmount',
          args: [BigInt(id!), address],
        })) as bigint;
        outstanding = stake;
      }

      return { record, outstanding };
    },
  });

  return {
    record: query.data?.record ?? null,
    outstanding: query.data?.outstanding ?? null,
    dataState: !addresses ? 'error' : query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    refetch: useCallback(() => void query.refetch(), [query]),
  };
}

/** Invalidate all reads (list + detail + token) after a confirmed write */
export function useInvalidateCampaigns(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
}
