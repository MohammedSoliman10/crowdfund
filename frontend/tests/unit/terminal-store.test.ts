import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appendMessage,
  clearMessages,
  getMessages,
  logAction,
  logError,
  logSuccess,
  subscribeMessages,
} from '../../src/stores/terminalStore';

beforeEach(() => clearMessages());

describe('terminal store', () => {
  it('appends messages with severity and monotonic ids', () => {
    const a = logAction('hello');
    const b = logSuccess('done');
    const c = logError('oops');
    expect(a.severity).toBe('info');
    expect(b.severity).toBe('success');
    expect(c.severity).toBe('error');
    expect(b.id).toBeGreaterThan(a.id);
    expect(c.id).toBeGreaterThan(b.id);
    expect(getMessages()).toHaveLength(3);
    expect(getMessages()[0].text).toBe('hello');
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMessages(listener);
    appendMessage('info', 'one');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    appendMessage('info', 'two');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('caps the log at 200 entries', () => {
    for (let i = 0; i < 205; i++) appendMessage('info', `line ${i}`);
    const messages = getMessages();
    expect(messages).toHaveLength(200);
    expect(messages[0].text).toBe('line 5');
    expect(messages[199].text).toBe('line 204');
  });

  it('clears on demand', () => {
    appendMessage('info', 'x');
    clearMessages();
    expect(getMessages()).toHaveLength(0);
  });
});
