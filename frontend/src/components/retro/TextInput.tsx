import { useId } from 'react';

/** Retro labeled input with error + hint slots (FR-013 plain-language errors) */
export interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'search' | 'date' | 'datetime-local';
  error?: string | null;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  min?: string;
  max?: string;
  step?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  testId?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  error,
  hint,
  placeholder,
  disabled = false,
  maxLength,
  min,
  max,
  step,
  inputMode,
  testId,
}: TextInputProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-base text-shadow">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className={[
          'w-full bg-paper px-2 py-1 text-xl text-shadow shadow-bevel-in',
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
        <p
          id={errorId}
          role="alert"
          data-testid="input-error"
          className="flex items-start gap-2 text-base text-shadow"
        >
          <span aria-hidden className="bg-alertred px-1 font-bold text-shadow" style={{ color: '#000000' }}>
            X
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
