/** Beveled progress bar with exact percentage (FR-004) */
export interface ProgressBarProps {
  /** May exceed 100 when over-funded */
  pct: number;
  /** Exact value shown to AT + visually (e.g. "62% funded") */
  valueText?: string;
  className?: string;
  testId?: string;
}

export function ProgressBar({ pct, valueText, className = '', testId = 'progress-bar' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText ?? `${Math.round(pct)}%`}
      data-testid={testId}
      className={`relative h-5 w-full bg-paper shadow-bevel-in ${className}`}
    >
      <div
        className="h-full bg-teal"
        style={{
          width: `${clamped}%`,
          backgroundImage:
            'repeating-linear-gradient(90deg, var(--color-navy) 0 8px, transparent 8px 11px)',
        }}
      />
    </div>
  );
}
