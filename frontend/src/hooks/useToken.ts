import { useQuery } from '@tanstack/react-query';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { mockTokenAbi } from '../abis';
import { addressesFor } from '../config/contracts';

export interface UseTokenResult {
  balance: bigint;
  allowance: bigint;
  isLoading: boolean;
  refetch: () => void;
}

/** Viewer's pledge-token balance + allowance to CrowdFund (T040) */
export function useToken(): UseTokenResult {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const addresses = addressesFor(chainId);

  const query = useQuery({
    queryKey: ['token', chainId, address ?? 'none'],
    enabled: isConnected && !!address && !!publicClient && !!addresses,
    staleTime: 5_000,
    queryFn: async () => {
      const client = publicClient!;
      const token = addresses!.pledgeToken;
      const fund = addresses!.crowdFund;
      const [balance, allowance] = await Promise.all([
        client.readContract({ address: token, abi: mockTokenAbi, functionName: 'balanceOf', args: [address!] }),
        client.readContract({
          address: token,
          abi: mockTokenAbi,
          functionName: 'allowance',
          args: [address!, fund],
        }),
      ]);
      return { balance: balance as bigint, allowance: allowance as bigint };
    },
  });

  return {
    balance: query.data?.balance ?? 0n,
    allowance: query.data?.allowance ?? 0n,
    isLoading: query.isPending,
    refetch: () => void query.refetch(),
  };
}
