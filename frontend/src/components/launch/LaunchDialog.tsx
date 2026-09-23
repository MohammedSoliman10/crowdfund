import { useEffect, useRef, useState } from 'react';
import { Dialog } from '../retro/Dialog';
import { Window } from '../retro/Window';
import { Button } from '../retro/Button';
import { TextInput } from '../retro/TextInput';
import { TextArea } from '../retro/TextArea';
import { useLaunch } from '../../hooks/useCampaignActions';
import { useChainNow } from '../../hooks/useChainNow';
import { useWalletSession } from '../../hooks/useWalletSession';
import { getActionAvailability } from '../../lib/actions';
import type { LaunchInput } from '../../lib/validate/launch';

function toLocalValue(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface LaunchDialogProps {
  open: boolean;
  onClose: () => void;
  onLaunched: (id: number | undefined) => void;
}

/** US3 launch flow: goal/title/description/start/end with plain-language errors */
export function LaunchDialog({ open, onClose, onLaunched }: LaunchDialogProps) {
  const { run, isPending } = useLaunch();
  const chainNow = useChainNow();
  const wallet = useWalletSession();
  const [goalText, setGoalText] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Availability matrix is the single source for launch eligibility
  // (wallet connected + correct network — FR-015), reason shown when blocked
  const launchAvailability = getActionAvailability({
    campaign: null,
    session: wallet.session,
    contribution: null,
  }).launch;

  // Defaults are seeded from CHAIN time (contract compares startAt >= block.timestamp)
  const defaultsSeeded = useRef(false);
  useEffect(() => {
    if (defaultsSeeded.current || chainNow === null) return;
    defaultsSeeded.current = true;
    setStartLocal(toLocalValue(chainNow + 60 * 60));
    setEndLocal(toLocalValue(chainNow + 7 * 24 * 60 * 60));
  }, [chainNow]);

  const submit = async () => {
    const input: LaunchInput = { goalText, title, description, startLocal, endLocal };
    const result = await run(input);
    if (result.ok) {
      setError(null);
      setGoalText('');
      setTitle('');
      setDescription('');
      onLaunched(result.id);
    } else {
      setError(result.message ?? null);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} title="Launch a Campaign" onClose={onClose} testId="launch-dialog">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        data-testid="launch-form"
      >
        <p className="text-base text-shadow">
          All fields are required. Validation happens before any transaction is sent.
        </p>

        <TextInput
          label="Funding goal (CFT)"
          value={goalText}
          onChange={(value) => {
            setGoalText(value);
            setError(null);
          }}
          inputMode="decimal"
          placeholder="1000.0"
          disabled={isPending}
          testId="launch-goal"
        />

        <TextInput
          label="Title (max 80 characters)"
          value={title}
          onChange={(value) => {
            setTitle(value);
            setError(null);
          }}
          maxLength={96}
          placeholder="Solar Bus Shelter"
          disabled={isPending}
          hint={`${title.trim().length}/80 characters`}
          testId="launch-title"
        />

        <TextArea
          label="Description (max 500 characters)"
          value={description}
          onChange={(value) => {
            setDescription(value);
            setError(null);
          }}
          maxLength={560}
          placeholder="What are you raising funds for?"
          disabled={isPending}
          hint={`${description.trim().length}/500 characters`}
          testId="launch-description"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Starts"
            type="datetime-local"
            value={startLocal}
            onChange={(value) => {
              setStartLocal(value);
              setError(null);
            }}
            disabled={isPending}
            testId="launch-start"
          />
          <TextInput
            label="Ends"
            type="datetime-local"
            value={endLocal}
            onChange={(value) => {
              setEndLocal(value);
              setError(null);
            }}
            disabled={isPending}
            testId="launch-end"
          />
        </div>

        <p className="text-base text-shadow">Maximum duration: 90 days.</p>

        {error && (
          <Window title="Problem" showControls={false} testId="launch-error">
            <p role="alert" data-testid="launch-error-message" className="flex items-start gap-2 text-base text-shadow">
              <span aria-hidden className="bg-alertred px-1 font-bold" style={{ color: '#000000' }}>
                X
              </span>
              <span>{error}</span>
            </p>
          </Window>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isPending || !launchAvailability.enabled}
            reason={
              launchAvailability.enabled ? 'Waiting for wallet confirmation…' : launchAvailability.reason
            }
            onClick={() => void submit()}
            testId="launch-submit"
            variant="wide"
          >
            {isPending ? 'Launching…' : 'Launch Campaign'}
          </Button>
          <Button onClick={onClose} disabled={isPending} reason="Waiting for wallet confirmation…" testId="launch-cancel">
            Back
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
