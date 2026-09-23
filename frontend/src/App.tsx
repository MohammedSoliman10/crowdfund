import { useState } from 'react';
import { ConnectButton } from './components/wallet/ConnectButton';
import { CampaignListWindow } from './components/campaigns/CampaignListWindow';
import { CampaignDetailWindow } from './components/campaigns/CampaignDetailWindow';
import { LaunchDialog } from './components/launch/LaunchDialog';
import { Window } from './components/retro/Window';
import { Terminal } from './components/retro/Terminal';

/**
 * Desktop shell: header (identity + wallet), list + detail windows on the
 * teal desktop, status log pinned at the bottom (US4).
 */
export function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col gap-3 p-4" data-testid="app">
      <header className="bg-silver p-3 shadow-bevel-out">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight text-navy">Chicago.95 Crowdfund</h1>
            <p className="text-base text-shadow">on-chain crowdfunding — retro desktop edition</p>
          </div>
          <ConnectButton />
        </div>
        <div className="dashed-rule mt-3" aria-hidden />
      </header>

      <main className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2" data-testid="desktop">
        <CampaignListWindow
          selectedId={selectedId}
          onSelect={setSelectedId}
          onLaunchClick={() => setLaunchOpen(true)}
        />

        {selectedId !== null ? (
          <CampaignDetailWindow id={selectedId} onClose={() => setSelectedId(null)} />
        ) : (
          <Window title="Welcome" testId="welcome-window">
            <div className="dashed-rule" aria-hidden />
            <div className="flex flex-col gap-2 text-base text-shadow">
              <p>Select a campaign from the list to open its window.</p>
              <ul className="list-disc pl-6">
                <li>Browsing works with no wallet connected.</li>
                <li>Connect an injected wallet to pledge, withdraw, claim, or refund.</li>
                <li>Every action outcome lands in the status log below.</li>
              </ul>
              <p className="text-navy">Tip: contract reads go straight to the chain — no backend.</p>
            </div>
          </Window>
        )}
      </main>

      <footer data-testid="status-footer">
        <Window title="Status Log" testId="terminal-window">
          <Terminal />
        </Window>
      </footer>

      <LaunchDialog
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onLaunched={(id) => {
          setLaunchOpen(false);
          if (id) setSelectedId(id);
        }}
      />
    </div>
  );
}
