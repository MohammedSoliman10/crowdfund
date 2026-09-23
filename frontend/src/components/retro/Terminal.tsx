import { useEffect, useRef } from 'react';
import { useTerminalMessages } from '../../stores/terminalStore';
import type { TerminalMessageVM } from '../../types';

function lineClass(severity: TerminalMessageVM['severity']): string {
  if (severity === 'error') return 'text-alertred';
  if (severity === 'info') return 'text-silver';
  return 'text-terminalgreen';
}

/** Green-on-black status log (FR-018, US4) — polite live region, auto-scrolls */
export function Terminal({ className = '' }: { className?: string }) {
  const messages = useTerminalMessages();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label="Status log"
      data-testid="terminal"
      className={`retro-scroll h-44 overflow-y-auto bg-shadow p-2 font-console text-xl leading-snug shadow-bevel-in ${className}`}
    >
      {messages.length === 0 ? (
        <p className="text-silver" data-testid="terminal-empty">
          system ready — no activity yet…
        </p>
      ) : (
        messages.map((message) => (
          <p key={message.id} data-testid="terminal-line" className={lineClass(message.severity)}>
            <span className="text-silver">[{message.timeLabel}]</span> {message.text}
          </p>
        ))
      )}
    </div>
  );
}
