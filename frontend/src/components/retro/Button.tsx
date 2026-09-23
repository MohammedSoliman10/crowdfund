import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';

/**
 * Retro beveled button (FR-017).
 * Contract (ui-state-contracts §4): a disabled button MUST carry a visible,
 * plain-language reason — rendered directly beneath the control.
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  children: ReactNode;
  disabled?: boolean;
  /** Required whenever disabled is true — explains why in plain language */
  reason?: string | null;
  variant?: 'default' | 'wide';
  testId?: string;
}

export function Button({
  children,
  disabled = false,
  reason,
  variant = 'default',
  testId,
  className = '',
  onClick,
  ...rest
}: ButtonProps) {
  if (disabled && !reason && import.meta.env.DEV) {
    // Enforces the no-reason-no-disable contract at development time
    console.error('[Button] disabled button rendered without a plain-language reason:', children);
  }

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const button = (
    <button
      type="button"
      aria-disabled={disabled}
      onClick={handleClick}
      data-testid={testId}
      className={[
        'inline-flex items-center justify-center gap-2 bg-silver px-4 py-1 text-xl text-shadow',
        'shadow-bevel-out-sm select-none',
        'hover:brightness-105 active:translate-y-px active:shadow-bevel-in-sm',
        'disabled:cursor-not-allowed disabled:text-bevelDarker disabled:hover:brightness-100 disabled:active:translate-y-0',
        variant === 'wide' ? 'min-w-40' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );

  if (disabled && reason) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        {button}
        <span
          role="note"
          data-testid="disabled-reason"
          className="max-w-64 text-base leading-tight text-shadow"
        >
          {reason}
        </span>
      </span>
    );
  }

  return button;
}
