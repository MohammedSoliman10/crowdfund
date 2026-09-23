import { describe, expect, it } from 'vitest';
import { M, toUserMessage } from '../../src/lib/errors';

describe('toUserMessage maps every contract revert', () => {
  const cases: Array<[string, string]> = [
    ['start at < now', M.START_IN_PAST],
    ['end at < start at', M.END_BEFORE_START],
    ['end at > max duration', M.MAX_DURATION],
    ['goal = 0', M.GOAL_ZERO],
    ['title empty', M.TITLE_EMPTY],
    ['title too long', M.TITLE_LONG],
    ['description empty', M.DESC_EMPTY],
    ['description too long', M.DESC_LONG],
    ['not creator', M.NOT_CREATOR],
    ['already started', M.ALREADY_STARTED],
    ['not started', M.NOT_STARTED],
    ['ended', M.ENDED],
    ['not ended', M.NOT_ENDED],
    ['insufficient pledge', M.INSUFFICIENT_PLEDGE],
    ['pledged < goal', M.GOAL_MISSED],
    ['pledged >= goal', M.GOAL_MET],
    ['claimed', M.CLAIMED],
    ['transfer failed', M.TRANSFER_FAILED],
    ['ERC20: insufficient allowance', M.ALLOWANCE],
    ['ERC20InsufficientAllowance(address, uint256, uint256)', M.ALLOWANCE],
    ['ERC20: insufficient balance', M.BALANCE],
    ['ERC20InsufficientBalance(address, uint256, uint256)', M.BALANCE],
  ];

  for (const [revert, expected] of cases) {
    it(`maps "${revert}"`, () => {
      expect(toUserMessage(new Error(revert))).toBe(expected);
    });
  }
});

describe('toUserMessage handles wallet + unknown errors', () => {
  it('maps user rejection by code', () => {
    expect(toUserMessage({ code: 4001, message: 'anything' })).toBe(M.REJECTED);
  });

  it('maps user rejection by message', () => {
    expect(toUserMessage(new Error('User rejected the request.'))).toBe(M.REJECTED);
  });

  it('searches nested cause chains', () => {
    const nested = new Error('outer wrapper', {
      cause: new Error('execution reverted: not creator'),
    });
    expect(toUserMessage(nested)).toBe(M.NOT_CREATOR);
  });

  it('falls back to the generic message', () => {
    expect(toUserMessage(new Error('some exotic failure'))).toBe(M.GENERIC);
    expect(toUserMessage(null)).toBe(M.GENERIC);
    expect(toUserMessage(undefined)).toBe(M.GENERIC);
  });

  it('never leaks raw revert text', () => {
    const raw = toUserMessage(new Error('execution reverted: not creator'));
    expect(raw).not.toContain('not creator');
    expect(raw).not.toContain('revert');
  });
});
