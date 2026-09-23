import { useId } from 'react';

/** Retro multi-line text field (campaign descriptions) with error/hint slots */
export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  testId?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  disabled = false,
  rows = 4,
  maxLength,
  testId,
}: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-base text-shadow">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className={[
          'w-full resize-y bg-paper px-2 py-1 text-xl leading-snug text-shadow shadow-bevel-in',
          'placeholder:text-bevelDarker',
          'disabled:cursor-not-allowed disabled:text-bevelDarker',
        ].join(' ')}
      />
      {hint && (
        <p id={hintId} className="text-base text-shadow" data-testid="input-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" data-testid="input-error" className="flex items-start gap-2 text-base text-shadow">
          <span aria-hidden className="bg-alertred px-1 font-bold" style={{ color: '#000000' }}>
            X
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
