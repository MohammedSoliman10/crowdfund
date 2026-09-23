import type { ReactNode } from 'react';

/** Shared Win95-style window chrome (FR-017): navy title bar + silver beveled body */
export interface WindowProps {
  title: string;
  children: ReactNode;
  /** Footer row (e.g. status text, paging controls) */
  footer?: ReactNode;
  /** When provided, the ✕ control becomes a real close button */
  onClose?: () => void;
  /** Decorative minimize/maximize squares (pure decoration in v1) */
  showControls?: boolean;
  className?: string;
  testId?: string;
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function Window({
  title,
  children,
  footer,
  onClose,
  showControls = true,
  className = '',
  testId,
}: WindowProps) {
  const headingId = `win-${slug(title)}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col bg-silver shadow-bevel-out ${className}`}
      data-testid={testId}
    >
      <header className="flex items-center justify-between gap-2 bg-navy px-1 py-0.5">
        <h2 id={headingId} className="px-1 font-display text-lg leading-tight text-paper">
          {title}
        </h2>
        {showControls && (
          <div className="flex items-center gap-1" aria-hidden={!onClose}>
            <span className="inline-block h-4 w-4 bg-silver shadow-bevel-out-sm" />
            <span className="inline-block h-4 w-4 bg-silver shadow-bevel-out-sm" />
            {onClose ? (
              <button
                type="button"
                aria-label={`Close ${title}`}
                onClick={onClose}
                data-testid="window-close"
                className="h-4 w-4 bg-silver text-xs leading-none text-shadow shadow-bevel-out-sm active:shadow-bevel-in-sm"
              >
                ×
              </button>
            ) : (
              <span className="inline-block h-4 w-4 bg-silver text-xs leading-none text-center text-shadow shadow-bevel-out-sm" />
            )}
          </div>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">{children}</div>
      {footer && (
        <footer className="border-t-2 border-bevelDark px-3 py-2" data-testid="window-footer">
          {footer}
        </footer>
      )}
    </section>
  );
}
