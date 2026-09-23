import { describe, expect, it } from 'vitest';
import { validatePledge, validateUnpledge } from '../../src/lib/validate/pledge';
import { M } from '../../src/lib/errors';

describe('validatePledge', () => {
  it('parses valid amounts', () => {
    const result = validatePledge({ amountText: '12.5', balance: 100n * 10n ** 18n });
    expect(result).toEqual({ ok: true, value: 12_500_000_000_000_000_000n });
  });

  it('rejects empty/invalid input', () => {
    expect(validatePledge({ amountText: '' })).toEqual({ ok: false, message: M.AMOUNT_INVALID });
    expect(validatePledge({ amountText: 'x' })).toEqual({ ok: false, message: M.AMOUNT_INVALID });
  });

  it('rejects zero', () => {
    expect(validatePledge({ amountText: '0' })).toEqual({ ok: false, message: M.AMOUNT_ZERO });
  });

  it('rejects amounts above balance', () => {
    const result = validatePledge({ amountText: '10', balance: 9n * 10n ** 18n });
    expect(result).toEqual({ ok: false, message: M.BALANCE });
  });

  it('allows exact balance', () => {
    const result = validatePledge({ amountText: '10', balance: 10n * 10n ** 18n });
    expect(result.ok).toBe(true);
  });
});

describe('validateUnpledge', () => {
  it('parses valid amounts within stake', () => {
    const result = validateUnpledge({ amountText: '5', outstanding: 10n * 10n ** 18n });
    expect(result.ok).toBe(true);
  });

  it('rejects more than the outstanding stake', () => {
    const result = validateUnpledge({ amountText: '11', outstanding: 10n * 10n ** 18n });
    expect(result).toEqual({ ok: false, message: M.INSUFFICIENT_PLEDGE });
  });

  it('rejects when there is no stake at all', () => {
    const result = validateUnpledge({ amountText: '1', outstanding: 0n });
    expect(result).toEqual({ ok: false, message: M.NOTHING_TO_WITHDRAW });
  });

  it('rejects zero/invalid', () => {
    expect(validateUnpledge({ amountText: '0', outstanding: 1n })).toEqual({ ok: false, message: M.AMOUNT_ZERO });
    expect(validateUnpledge({ amountText: '.', outstanding: 1n })).toEqual({ ok: false, message: M.AMOUNT_INVALID });
  });
});
