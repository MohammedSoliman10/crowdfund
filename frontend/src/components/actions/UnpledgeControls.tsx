import { useState } from 'react';
import { Button } from '../retro/Button';
import { TextInput } from '../retro/TextInput';
import { useUnpledge } from '../../hooks/useCampaignActions';
import { formatAmount } from '../../lib/format';
import type { ActionAvailability } from '../../types';

export interface UnpledgeControlsProps {
  campaignId: number;
  outstanding: bigint;
  availability: ActionAvailability;
}

/** Backer withdrawal of an existing stake (pre-claim, pre-end only) */
export function UnpledgeControls({ campaignId, outstanding, availability }: UnpledgeControlsProps) {
  const { run, isPending } = useUnpledge();
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
    const result = await run({ amountText: amount, campaignId, outstanding });
    if (result.ok) {
      setAmount('');
      setError(null);
    } else {
      setError(result.message ?? null);
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      data-testid="unpledge-form"
    >
      <h4 className="font-display text-base text-navy">Withdraw pledge</h4>

      <p className="text-base text-shadow" data-testid="my-stake" title={`${formatAmount(outstanding)} CFT pledged`}>
        Your stake: {formatAmount(outstanding)} CFT
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
            testId="unpledge-amount"
          />
        </div>
        <Button
          onClick={() => setAmount(formatAmount(outstanding, 18, 18))}
          disabled={disabled}
          reason={reason}
          testId="unpledge-max"
        >
          Max
        </Button>
      </div>

      <Button
        disabled={disabled}
        reason={reason}
        onClick={() => void submit()}
        testId="unpledge-submit"
        variant="wide"
      >
        {isPending ? 'Withdrawing…' : 'Unpledge'}
      </Button>
    </form>
  );
}
