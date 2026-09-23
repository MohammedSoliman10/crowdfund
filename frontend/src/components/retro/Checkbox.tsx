import { useId } from 'react';
import type { ReactNode } from 'react';

/** Retro checkbox: hidden native input (keyboard/AT) + pixel box visual */
export interface CheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shown when disabled (contract: disabled ⇒ visible reason) */
  reason?: string;
  testId?: string;
}

export function Checkbox({ label, checked, onChange, disabled = false, reason, testId }: CheckboxProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-xl text-shadow">
        <span className="relative inline-flex h-5 w-5 items-center justify-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
            data-testid={testId}
            className="peer h-5 w-5 cursor-pointer appearance-none bg-paper shadow-bevel-in-sm checked:bg-paper disabled:cursor-not-allowed
              peer-focus-visible:outline-2 peer-focus-visible:outline-dashed peer-focus-visible:outline-offset-2 peer-focus-visible:outline-navy"
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute text-lg leading-none text-shadow ${checked ? '' : 'hidden'}`}
          >
            ✔
          </span>
        </span>
        <span>{label}</span>
      </label>
      {disabled && reason && (
        <span role="note" data-testid="disabled-reason" className="pl-7 text-base text-shadow">
          {reason}
        </span>
      )}
    </div>
  );
}
