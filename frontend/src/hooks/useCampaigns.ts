import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useChainId, usePublicClient } from 'wagmi';
import { crowdFundAbi } from '../abis';
import { addressesFor } from '../config/contracts';
import { deriveStatus, nowSeconds } from '../lib/status';
import { LOG } from '../lib/logText';
import { logError, logSuccess } from '../stores/terminalStore';
import type { CampaignRecord } from '../types';

export const REFETCH_INTERVAL_MS = 12_000;

/** viem may decode the struct as a named object or a positional tuple */
function pick(raw: unknown, key: string, index: number): unknown {
  if (Array.isArray(raw)) return raw[index];
  return (raw as Record<string, unknown>)[key];
}

export function normalizeCampaign(id: number, raw: unknown): CampaignRecord {
  return {
    id,
    creator: String(pick(raw, 'creator', 0)),
    goal: pick(raw, 'goal', 1) as bigint,
    pledged: pick(raw, 'pledged', 2) as bigint,
    startAt: Number(pick(raw, 'startAt', 3)),
    endAt: Number(pick(raw, 'endAt', 4)),
    claimed: Boolean(pick(raw, 'claimed', 5)),
    title: String(pick(raw, 'title', 6)),
    description: String(pick(raw, 'description', 7)),
  };
}

export type ListDataState = 'loading' | 'ready' | 'error';

export interface UseCampaignsResult {
  /** Newest first (Clarification Q3); cancelled/deleted campaigns excluded */
  campaigns: CampaignRecord[];
  dataState: ListDataState;
  errorMessage: string | null;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Full-catalogue read: count + parallel per-id reads — direct from the chain,
 * no indexer (research R4/R6). One read path for UI and tests.
 */
export function useCampaigns(): UseCampaignsResult {
  const chainId = useChainId(); // configured default (local anvil) while browsing without a wallet
  const publicClient = usePublicClient({ chainId });
  const addresses = addressesFor(chainId);

  const query = useQuery({
    queryKey: ['campaigns', chainId, addresses?.crowdFund],
    enabled: !!addresses && !!publicClient,
    staleTime: 5_000,
    refetchInterval: REFETCH_INTERVAL_MS,
    queryFn: async () => {
      const client = publicClient!;
      const address = addresses!.crowdFund;

      const countResult = await client.readContract({
        address,
        abi: crowdFundAbi,
        functionName: 'count',
      });
      const total = Number(countResult as bigint);

      const ids: number[] = [];
      for (let id = total; id >= 1; id--) ids.push(id);

      const rows = await Promise.all(
        ids.map((id) =>
          client.readContract({
            address,
            abi: crowdFundAbi,
            functionName: 'campaigns',
            args: [BigInt(id)],
          }),
        ),
      );

      const now = nowSeconds();
      const records = rows.map((row, i) => normalizeCampaign(ids[i], row));
      // Cancelled campaigns were deleted on-chain — drop stale ids from lists
      return {
        records: records.filter((r) => deriveStatus(r, now) !== 'cancelled'),
        total,
      };
    },
  });

  const dataState: ListDataState = !addresses
    ? 'error'
    : query.isPending
      ? 'loading'
      : query.isError
        ? 'error'
        : 'ready';

  // Terminal log once per state transition (FR-018)
  const lastStateRef = useRef<ListDataState | null>(null);
  useEffect(() => {
    if (lastStateRef.current === dataState) return;
    lastStateRef.current = dataState;
    if (dataState === 'ready' && query.data) {
      logSuccess(`${LOG.SYNCED_PREFIX} ${query.data.records.length} total`);
    } else if (dataState === 'error') {
      logError(LOG.READ_ERROR);
    }
  }, [dataState, query.data]);

  return {
    campaigns: query.data?.records ?? [],
    dataState,
    errorMessage: !addresses ? 'not-deployed' : query.isError ? 'network' : null,
    refetch: () => void query.refetch(),
    isFetching: query.isFetching,
  };
}
