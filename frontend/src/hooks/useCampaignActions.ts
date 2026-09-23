import { useCallback, useState } from 'react';
import { useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog, type Abi } from 'viem';
import { crowdFundAbi, mockTokenAbi } from '../abis';
import { addressesFor } from '../config/contracts';
import { M, toUserMessage } from '../lib/errors';
import { LOG } from '../lib/logText';
import { nowSeconds } from '../lib/status';
import { validateLaunch, type LaunchInput } from '../lib/validate/launch';
import { validatePledge, validateUnpledge } from '../lib/validate/pledge';
import { logAction, logError, logSuccess } from '../stores/terminalStore';
import { useChainNow } from './useChainNow';

export interface WriteResult {
  ok: boolean;
  message?: string;
  /** Decoded Launch event id when launching */
  id?: number;
}

interface SendParams {
  abi: Abi;
  functionName: string;
  args: unknown[];
  sentLog: string;
  okLog: string;
  /** Use token address instead of CrowdFund (e.g. approve) */
  useTokenAddress?: boolean;
  /** Decode a `(<id>, ...)` event id from the receipt */
  decodeEventId?: boolean;
}

/**
 * Shared write pipeline (research R9 layer 2): pre-flight → wallet send →
 * receipt wait → cache invalidation → terminal log of the outcome.
 */
function useContractWriter() {
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const send = useCallback(
    async (params: SendParams): Promise<WriteResult> => {
      const addresses = addressesFor(chainId);
      const address = params.useTokenAddress ? addresses?.pledgeToken : addresses?.crowdFund;
      if (!address || !publicClient) {
        const message = M.NOT_DEPLOYED;
        logError(message);
        return { ok: false, message };
      }

      setIsPending(true);
      logAction(params.sentLog);
      try {
        const hash = await writeContractAsync({
          address,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args as never,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          const message = M.GENERIC;
          logError(message);
          return { ok: false, message };
        }

        await queryClient.invalidateQueries();
        logSuccess(params.okLog);

        let id: number | undefined;
        if (params.decodeEventId) id = decodeLaunchId(receipt.logs);
        return { ok: true, id };
      } catch (error) {
        const message = toUserMessage(error);
        logError(message);
        return { ok: false, message };
      } finally {
        setIsPending(false);
      }
    },
    [writeContractAsync, chainId, publicClient, queryClient],
  );

  return { send, isPending };
}

function decodeLaunchId(logs: ReadonlyArray<{ data: `0x${string}`; topics: readonly [`0x${string}`, ...`0x${string}`[]] | [] }>): number | undefined {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: crowdFundAbi,
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        strict: false,
      });
      const args = decoded.args as Record<string, unknown> | undefined;
      if (args && 'id' in args) return Number(args.id);
    } catch {
      // not our event — keep scanning
    }
  }
  return undefined;
}

// ---------------------------------------------------------------- launch

export function useLaunch() {
  const { send, isPending } = useContractWriter();
  const chainNow = useChainNow();

  const run = useCallback(
    async (input: LaunchInput): Promise<WriteResult> => {
      // Pre-flight against CHAIN time — the contract requires startAt >= block.timestamp
      const validated = validateLaunch(input, chainNow ?? nowSeconds());
      if (!validated.ok) {
        logError(validated.message);
        return { ok: false, message: validated.message };
      }
      const v = validated.value;
      return send({
        abi: crowdFundAbi,
        functionName: 'launch',
        args: [v.goal, v.startAt, v.endAt, v.title, v.description],
        sentLog: LOG.LAUNCH_SENT,
        okLog: LOG.LAUNCH_OK,
        decodeEventId: true,
      });
    },
    [send, chainNow],
  );

  return { run, isPending };
}

// ---------------------------------------------------------------- pledge (with auto-approve)

export interface PledgeArgs {
  campaignId: number;
  amount: bigint;
  /** Current allowance — when insufficient, an approve tx is sent first */
  allowance?: bigint | null;
}

export function usePledge() {
  const { send, isPending } = useContractWriter();
  const chainId = useChainId();

  const run = useCallback(
    async (args: {
      amountText: string;
      campaignId: number;
      balance?: bigint;
      allowance?: bigint | null;
    }): Promise<WriteResult> => {
      const validated = validatePledge({ amountText: args.amountText, balance: args.balance });
      if (!validated.ok) {
        logError(validated.message);
        return { ok: false, message: validated.message };
      }
      const amount = validated.value;

      // Allowance is insufficient → approve exact amount first (auto two-step)
      if (args.allowance === undefined || args.allowance === null || args.allowance < amount) {
        const fund = addressesFor(chainId)?.crowdFund;
        if (!fund) {
          const message = M.NOT_DEPLOYED;
          logError(message);
          return { ok: false, message };
        }
        const approve = await send({
          abi: mockTokenAbi,
          functionName: 'approve',
          args: [fund, amount],
          sentLog: LOG.APPROVE_SENT,
          okLog: LOG.APPROVE_OK,
          useTokenAddress: true,
        });
        if (!approve.ok) return approve;
      }

      return send({
        abi: crowdFundAbi,
        functionName: 'pledge',
        args: [BigInt(args.campaignId), amount],
        sentLog: LOG.PLEDGE_SENT,
        okLog: LOG.PLEDGE_OK,
      });
    },
    [send, chainId],
  );

  return { run, isPending };
}

// ---------------------------------------------------------------- unpledge

export function useUnpledge() {
  const { send, isPending } = useContractWriter();

  const run = useCallback(
    async (args: { amountText: string; campaignId: number; outstanding?: bigint | null }): Promise<WriteResult> => {
      const validated = validateUnpledge({ amountText: args.amountText, outstanding: args.outstanding });
      if (!validated.ok) {
        logError(validated.message);
        return { ok: false, message: validated.message };
      }
      return send({
        abi: crowdFundAbi,
        functionName: 'unpledge',
        args: [BigInt(args.campaignId), validated.value],
        sentLog: LOG.UNPLEDGE_SENT,
        okLog: LOG.UNPLEDGE_OK,
      });
    },
    [send],
  );

  return { run, isPending };
}

// ---------------------------------------------------------------- cancel

export function useCancel() {
  const { send, isPending } = useContractWriter();
  const run = useCallback(
    (campaignId: number) =>
      send({
        abi: crowdFundAbi,
        functionName: 'cancel',
        args: [BigInt(campaignId)],
        sentLog: LOG.CANCEL_SENT,
        okLog: LOG.CANCEL_OK,
      }),
    [send],
  );
  return { run, isPending };
}

// ---------------------------------------------------------------- claim

export function useClaim() {
  const { send, isPending } = useContractWriter();
  const run = useCallback(
    (campaignId: number) =>
      send({
        abi: crowdFundAbi,
        functionName: 'claim',
        args: [BigInt(campaignId)],
        sentLog: LOG.CLAIM_SENT,
        okLog: LOG.CLAIM_OK,
      }),
    [send],
  );
  return { run, isPending };
}

// ---------------------------------------------------------------- refund

export function useRefund() {
  const { send, isPending } = useContractWriter();
  const run = useCallback(
    (campaignId: number) =>
      send({
        abi: crowdFundAbi,
        functionName: 'refund',
        args: [BigInt(campaignId)],
        sentLog: LOG.REFUND_SENT,
        okLog: LOG.REFUND_OK,
      }),
    [send],
  );
  return { run, isPending };
}
