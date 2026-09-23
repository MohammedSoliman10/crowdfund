/**
 * In-memory status-log store (FR-018, US4) — no localStorage persistence.
 * React binding via useSyncExternalStore (no extra state dependency).
 */
import { useSyncExternalStore } from 'react';
import { clockLabel } from '../lib/format';
import type { TerminalMessageVM } from '../types';

type Severity = TerminalMessageVM['severity'];

let messages: TerminalMessageVM[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function appendMessage(severity: Severity, text: string): TerminalMessageVM {
  const message: TerminalMessageVM = {
    id: nextId++,
    timeLabel: clockLabel(),
    severity,
    text,
  };
  // Bound the log so a long session never grows without limit
  messages = [...messages, message].slice(-200);
  emit();
  return message;
}

export function logAction(text: string): TerminalMessageVM {
  return appendMessage('info', text);
}

export function logSuccess(text: string): TerminalMessageVM {
  return appendMessage('success', text);
}

export function logError(text: string): TerminalMessageVM {
  return appendMessage('error', text);
}

export function getMessages(): TerminalMessageVM[] {
  return messages;
}

export function subscribeMessages(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearMessages(): void {
  messages = [];
  emit();
}

export function useTerminalMessages(): TerminalMessageVM[] {
  return useSyncExternalStore(subscribeMessages, getMessages, getMessages);
}
