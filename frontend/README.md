# Chicago.95 Crowdfund — Frontend

Retro-workstation crowdfunding dApp UI (Chicago.95 design system) for the Foundry
contracts in `../contracts`. Reads go **straight from the chain** — there is no
backend, database, or indexer. Feature spec: `../specs/001-crowdfund-frontend-ui/`.

## Stack

React 18 · TypeScript · Vite · wagmi + viem · TanStack Query · Tailwind 3
(config-based design tokens) · @fontsource pixel fonts (VT323, Pixelify Sans,
Silkscreen) · Vitest + React Testing Library · Playwright.

## Prerequisites

- Foundry (`forge`, `anvil`, `cast`) — validated with v1.7.1
- Node.js ≥ 20 + npm (validated with v24 / npm 11)
- An injected browser wallet (MetaMask-style) for manual runs

## Contracts: test & local deploy

```bash
cd contracts
forge test                              # full suite, incl. title/description extension

# local chain, terminal 1
anvil                                   # http://127.0.0.1:8545, chain id 31337

# deploy MockToken + CrowdFund, terminal 2 (anvil account #0 — local dev only)
forge script script/Deploy.s.sol:DeployScript --broadcast \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

The deploy script prints both addresses. Wire them into the frontend either way:

- **addresses file** — `src/config/contracts.ts` (`ADDRESSES[31337]`), or
- **env overrides** — `.env.local`:
  `VITE_CROWDFUND_ADDRESS=0x…` / `VITE_TOKEN_ADDRESS=0x…`

## Seed a dev catalogue (optional but recommended)

From `frontend/` against the freshly deployed chain:

```bash
node scripts/seed.mjs     # 14 campaigns covering all statuses + token balances/stakes
node scripts/verify.mjs   # prints the status table and asserts the expected tally
```

The seeder mints pledge tokens (alice 3,000 / bob 7,000 CFT), launches fixtures
for every status (upcoming / live / successful / failed), stakes contributions,
and warps Anvil time forward so all states are immediately reachable.

## Run the app

```bash
npm install
npm run dev             # http://localhost:5173
```

**Wallet setup**: import an Anvil dev account (mnemonic
`test test test test test test test test test test test junk`, e.g. account #1 =
alice `0x70997970…79C8` as the backer, account #0 as the creator) and add the
network: RPC `http://127.0.0.1:8545`, chain id `31337`, symbol `ETH`.

**Wrong-network guidance**: FR-015 — if the connected wallet is on any chain
other than Anvil (31337) / Sepolia (11155111), a warning banner appears and every
write control shows a "switch to continue" reason.

## Commands

```bash
npm run dev             # Vite dev server
npm run typecheck       # tsc --noEmit
npm run lint            # ESLint (src + tests)
npm run format          # Prettier
npm run test:unit       # Vitest: status, validation, error map, matrix, components (…tests)
npm run test:e2e        # Playwright (see below)
npm run build           # typecheck + production build to dist/
```

### End-to-end tests

```bash
# terminal 1: anvil, freshly deployed + seeded (see above)
# terminal 2:
npx playwright install chromium        # once
npm run test:e2e                       # webServer starts the dev server itself
```

The harness injects a minimal `window.ethereum` stub that proxies JSON-RPC to
Anvil (with per-test account selection and chain-id overrides), so no real
wallet extension is needed. System libs for the headless browser come from
`npx playwright install-deps chromium` (requires root) on bare machines.

**Note**: the e2e suite mutates chain state (claims, refunds, launches). Reseed
with `node scripts/seed.mjs` after a fresh `anvil` restart to restore fixtures.

## Sepolia (live target)

1. Deploy with a funded testnet key:
   `forge script script/Deploy.s.sol:DeployScript --broadcast --rpc-url <sepolia-rpc> --private-key <key>`
2. Set `.env.local`:
   `VITE_SEPOLIA_CROWDFUND_ADDRESS=0x…` / `VITE_SEPOLIA_TOKEN_ADDRESS=0x…`
3. Mint/transfer pledge tokens to users (deployer owns the token).
4. Switch the wallet to Sepolia — the app follows automatically; other networks
   trigger the wrong-network guidance.

Until Sepolia addresses are configured, `addressesFor()` returns `null` for
11155111 and the UI reports the platform as "not deployed on this network".

## Layout

```
src/
  components/retro/       Window, Button, TextInput, TextArea, Checkbox, Dialog,
                          ProgressBar, Terminal  (design-system primitives)
  components/campaigns/   CampaignCard, CampaignListWindow, CampaignDetailWindow
  components/actions/     PledgeForm, UnpledgeControls
  components/launch/      LaunchDialog
  components/wallet/      ConnectButton
  hooks/                  useCampaign(s), useToken, useChainNow, useWalletSession,
                          useCampaignActions (launch/pledge/unpledge/cancel/claim/refund)
  lib/                    status (deriveStatus), format, errors (revert map),
                          actions (eligibility matrix), validate/ (pre-flight)
  config/                 chains.ts, contracts.ts (env-overridable addresses)
  styles/                 tokens.css, globals.css
  stores/                 terminalStore (session log)
tests/unit/               Vitest + RTL        tests/e2e/  Playwright
scripts/                  seed.mjs, verify.mjs
```

## Design-system rules (enforced in code)

- Radius `0`, 2px bevels (`bevel-out` / `bevel-in`), 90° corners; pressed state
  **inverts** the bevel.
- 8/16-color palette only (`tailwind.config.ts` keys are lowercase:
  `terminalgreen`, `alertred`, `alertyellow`, `bevelDark(er)` …).
- Every disabled button carries a visible plain-language `reason`
  (`Button` console-errors in dev if missing).
- Every action outcome is logged to the terminal panel (`role="log"`,
  `aria-live="polite"`); raw revert strings never reach the UI (two-layer
  error mapping in `lib/errors.ts`).
- Timing/status derive from **chain time** (`useChainNow` → `block.timestamp`),
  never the browser clock.
