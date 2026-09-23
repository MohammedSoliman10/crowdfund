/** Pre-flight pledge/unpledge validation (layer 1 of research R9) */
import { M } from '../errors';
import { parseAmount } from '../format';

export type AmountResult = { ok: true; value: bigint } | { ok: false; message: string };

export interface PledgeInput {
  amountText: string;
  balance?: bigint;
}

export interface UnpledgeInput {
  amountText: string;
  outstanding?: bigint | null;
}

export function validatePledge(input: PledgeInput): AmountResult {
  const amount = parseAmount(input.amountText);
  if (amount === null) return { ok: false, message: M.AMOUNT_INVALID };
  if (amount <= 0n) return { ok: false, message: M.AMOUNT_ZERO };
  if (input.balance !== undefined && amount > input.balance) {
    return { ok: false, message: M.BALANCE };
  }
  return { ok: true, value: amount };
}

export function validateUnpledge(input: UnpledgeInput): AmountResult {
  const amount = parseAmount(input.amountText);
  if (amount === null) return { ok: false, message: M.AMOUNT_INVALID };
  if (amount <= 0n) return { ok: false, message: M.AMOUNT_ZERO };
  if (input.outstanding !== undefined && input.outstanding !== null) {
    if (input.outstanding === 0n) return { ok: false, message: M.NOTHING_TO_WITHDRAW };
    if (amount > input.outstanding) return { ok: false, message: M.INSUFFICIENT_PLEDGE };
  }
  return { ok: true, value: amount };
}
