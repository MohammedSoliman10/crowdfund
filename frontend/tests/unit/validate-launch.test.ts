import { describe, expect, it } from 'vitest';
import { validateLaunch } from '../../src/lib/validate/launch';
import { M } from '../../src/lib/errors';

const NOW = 1_800_000_000;

function localValue(seconds: number): string {
  const d = new Date(seconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function input(overrides: Partial<Parameters<typeof validateLaunch>[0]> = {}) {
  return {
    goalText: '1000',
    title: 'Solar Bus Shelter',
    description: 'Raise funds for 10 shelters.',
    startLocal: localValue(NOW + 3_600),
    endLocal: localValue(NOW + 86_400),
    ...overrides,
  };
}

describe('validateLaunch happy path', () => {
  it('accepts a valid launch and converts units', () => {
    const result = validateLaunch(input(), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goal).toBe(1_000n * 10n ** 18n);
      expect(result.value.title).toBe('Solar Bus Shelter');
      expect(result.value.endAt).toBeGreaterThan(result.value.startAt);
    }
  });
});

describe('validateLaunch rejection cases (pre-flight, no tx)', () => {
  it('rejects empty/invalid goal', () => {
    expect(validateLaunch(input({ goalText: '' }), NOW)).toEqual({ ok: false, message: M.AMOUNT_INVALID });
    expect(validateLaunch(input({ goalText: 'abc' }), NOW)).toEqual({ ok: false, message: M.AMOUNT_INVALID });
    expect(validateLaunch(input({ goalText: '0' }), NOW)).toEqual({ ok: false, message: M.GOAL_ZERO });
  });

  it('rejects empty title/description', () => {
    expect(validateLaunch(input({ title: '   ' }), NOW)).toEqual({ ok: false, message: M.TITLE_EMPTY });
    expect(validateLaunch(input({ description: '' }), NOW)).toEqual({ ok: false, message: M.DESC_EMPTY });
  });

  it('enforces BYTE limits (UTF-8), not character counts', () => {
    // 28 × '€' = 84 bytes but only 28 characters
    const euroTitle = '€'.repeat(28);
    expect(validateLaunch(input({ title: euroTitle }), NOW)).toEqual({ ok: false, message: M.TITLE_LONG });
    // 80 ASCII chars is exactly at the limit — allowed
    expect(validateLaunch(input({ title: 'a'.repeat(80) }), NOW).ok).toBe(true);
    expect(validateLaunch(input({ description: 'd'.repeat(500) }), NOW).ok).toBe(true);
    expect(validateLaunch(input({ description: 'd'.repeat(501) }), NOW)).toEqual({ ok: false, message: M.DESC_LONG });
  });

  it('rejects start times in the past', () => {
    expect(validateLaunch(input({ startLocal: localValue(NOW - 60) }), NOW)).toEqual({
      ok: false,
      message: M.START_IN_PAST,
    });
    expect(validateLaunch(input({ startLocal: '' }), NOW)).toEqual({ ok: false, message: M.START_IN_PAST });
  });

  it('rejects end before start', () => {
    const bad = input({ startLocal: localValue(NOW + 7_200), endLocal: localValue(NOW + 3_600) });
    expect(validateLaunch(bad, NOW)).toEqual({ ok: false, message: M.END_BEFORE_START });
  });

  it('rejects durations beyond 90 days', () => {
    const bad = input({ startLocal: localValue(NOW + 3_600), endLocal: localValue(NOW + 3_600 + 91 * 86_400) });
    expect(validateLaunch(bad, NOW)).toEqual({ ok: false, message: M.MAX_DURATION });
  });

  it('accepts an end exactly 90 days from now (contract rule)', () => {
    const ok = input({ startLocal: localValue(NOW + 3_600), endLocal: localValue(NOW + 90 * 86_400) });
    expect(validateLaunch(ok, NOW).ok).toBe(true);
  });
});
