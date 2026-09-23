import { useState } from 'react';
import { Button } from '../retro/Button';
import { TextInput } from '../retro/TextInput';
import { usePledge } from '../../hooks/useCampaignActions';
import { useToken } from '../../hooks/useToken';
import { formatAmount } from '../../lib/format';
import type { ActionAvailability } from '../../types';

export interface PledgeFormProps {
  campaignId: number;
  availability: ActionAvailability;
}

/** Backer pledge flow: balance display, amount entry, auto-approve + pledge */
export function PledgeForm({ campaignId, availability }: PledgeFormProps) {
  const { balance, allowance } = useToken();
  const { run, isPending } = usePledge();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const blocked = !availability.enabled;
  const disabled = blocked || isPending;
  const reason = blocked
    ? availability.reason
    : isPending
      ? 'Waiting for wallet confirmation…'
      : undefined;

  const submit = async () => {
    const result = await run({ amountText: amount, campaignId, balance, allowance });
    if (result.ok) {
      setAmount('');
      setError(null);
    } else {
      setError(result.message ?? null);
    }
  };

  const needsApproval = allowance < balance || allowance === 0n;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      data-testid="pledge-form"
    >
      <h4 className="font-display text-base text-navy">Pledge tokens</h4>

      <p className="text-base text-shadow" data-testid="token-balance" title={`${formatAmount(balance)} CFT`}>
        Balance: {formatAmount(balance)} CFT
        {allowance > 0n && allowance < balance && (
          <span className="ml-2 text-navy">(approve needed: {formatAmount(allowance)} allowed)</span>
        )}
      </p>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextInput
            label="Amount (CFT)"
            value={amount}
            onChange={(value) => {
              setAmount(value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="0.0"
            disabled={disabled}
            error={error}
            hint={needsApproval ? 'An approval transaction will run automatically first.' : undefined}
            testId="pledge-amount"
          />
        </div>
        <Button
          onClick={() => setAmount(formatAmount(balance, 18, 18))}
          disabled={disabled}
          reason={reason}
          testId="pledge-max"
        >
          Max
        </Button>
      </div>

      <Button
        disabled={disabled}
        reason={reason}
        onClick={() => void submit()}
        testId="pledge-submit"
        variant="wide"
      >
        {isPending ? 'Pledging…' : 'Pledge'}
      </Button>
    </form>
  );
}
