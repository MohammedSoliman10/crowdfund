/** Pre-flight launch validation (layer 1 of research R9) — mirrors CrowdFund.launch requires */
import { M } from '../errors';

export interface LaunchInput {
  goalText: string;
  title: string;
  description: string;
  /** datetime-local value (yyyy-MM-ddTHH:mm) or empty */
  startLocal: string;
  endLocal: string;
}

export interface LaunchValues {
  goal: bigint;
  startAt: number;
  endAt: number;
  title: string;
  description: string;
}

export type ValidationResult =
  | { ok: true; value: LaunchValues }
  | { ok: false; message: string };

const MAX_DURATION_SECONDS = 90 * 24 * 60 * 60;
const encoder = new TextEncoder();

function parseLocal(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

export function validateLaunch(input: LaunchInput, now: number): ValidationResult {
  const goalText = input.goalText.trim();
  if (!/^\d*\.?\d*$/.test(goalText) || goalText === '' || goalText === '.') {
    return { ok: false, message: M.AMOUNT_INVALID };
  }
  const [intPart = '', fracPart = ''] = goalText.split('.');
  if (fracPart.length > 18) return { ok: false, message: M.AMOUNT_INVALID };
  const goal =
    BigInt(intPart === '' ? '0' : intPart) * 10n ** 18n +
    (fracPart ? BigInt(fracPart) : 0n);
  if (goal <= 0n) return { ok: false, message: M.GOAL_ZERO };

  const title = input.title.trim();
  if (title.length === 0) return { ok: false, message: M.TITLE_EMPTY };
  if (encoder.encode(title).length > 80) return { ok: false, message: M.TITLE_LONG };

  const description = input.description.trim();
  if (description.length === 0) return { ok: false, message: M.DESC_EMPTY };
  if (encoder.encode(description).length > 500) return { ok: false, message: M.DESC_LONG };

  const startAt = parseLocal(input.startLocal);
  if (startAt === null) return { ok: false, message: M.START_IN_PAST };
  if (startAt < now) return { ok: false, message: M.START_IN_PAST };

  const endAt = parseLocal(input.endLocal);
  if (endAt === null) return { ok: false, message: M.END_BEFORE_START };
  if (endAt < startAt) return { ok: false, message: M.END_BEFORE_START };
  // Contract mirror: endAt <= block.timestamp + 90 days (90 days from now,
  // regardless of start) — `end at > max duration` revert
  if (endAt > now + MAX_DURATION_SECONDS) return { ok: false, message: M.MAX_DURATION };

  return { ok: true, value: { goal, startAt, endAt, title, description } };
}
