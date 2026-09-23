# Implementation Plan: Crowdfund Frontend UI

**Branch**: `001-crowdfund-frontend-ui` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-crowdfund-frontend-ui/spec.md`

## Summary

Build a retro "Chicago.95"-styled crowdfunding web frontend (browse, fund, launch, cancel, claim, refund) on top of the existing Foundry `CrowdFund` contract, rendered entirely in the reference image's design language — teal desktop, navy title-bar windows, beveled chrome, 8/16-color palette, pixel typography, terminal-style status log — with baseline accessibility (keyboard, focus, AA contrast, resizable text) guaranteed alongside full retro fidelity.

Technical approach: a React + TypeScript SPA styled with Tailwind backed by CSS custom-property design tokens, talking directly to the chain via wagmi/viem (injected wallet only, no backend), on a local Anvil chain while building and a public testnet (Sepolia) as the live target. The `CrowdFund` contract receives one minimal extension — on-chain `title`/`description` per campaign (Clarification Q1) — covered by new Foundry tests.

## Technical Context

**Language/Version**: TypeScript ~5.x (frontend); Solidity 0.8.28 (existing contracts, per `contracts/foundry.toml`)

**Primary Dependencies**: React 18+ + Vite (SPA), wagmi + viem + TanStack Query (chain reads/writes, injected connector), Tailwind CSS + CSS custom properties (design tokens), self-hosted pixel fonts (@fontsource: VT323, Pixelify Sans, Silkscreen); Foundry/OpenZeppelin (existing, contracts side)

**Storage**: N/A — no backend, database, or off-chain service; all campaign/contribution data on-chain (localStorage only for trivial UI preferences, e.g., dismissed dialogs)

**Testing**: Vitest + React Testing Library (unit/component), Playwright (end-to-end against local Anvil with an injected-wallet stub), Forge `forge test` (contract unit + integration, incl. the title/description extension)

**Target Platform**: Latest modern desktop browsers (Chrome, Edge, Firefox, Safari); chains: local Anvil (chain id 31337) during development, Sepolia as the default live network (Clarification Q4); injected browser wallets only (Clarification Q2)

**Project Type**: Web application (frontend SPA) + smart contracts — existing `contracts/` retained, new `frontend/` added

**Performance Goals**: Usable campaign list within 3s on home broadband; filter/search/"Load more" with no perceptible freeze (SC-006); connect-and-fund ≤2 min first attempt (SC-002); launch ≤3 min (SC-003)

**Constraints**: Full retro fidelity with baseline accessibility — keyboard operable, visible focus, AA contrast where the palette allows, resizable text (FR-021, SC-008); no unstyled platform-default controls (SC-005); no backend; injected wallet only; frontend-first scope with one minimal contract extension

**Scale/Scope**: ~6 window-views (list, detail, launch, connect, claim/refund, terminal), 21 FRs, single ERC-20 pledge token, campaign catalogue up to hundreds with newest-first paging

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` exists but is an **unfilled template** — it contains only placeholder headings (`[PRINCIPLE_1_NAME]`, etc.) and no ratified principles, versions, or governance rules. There are therefore **no enforceable gates to evaluate**.

- Gate result: **PASS (no principles defined)** — nothing to violate.
- Default engineering discipline applied in lieu of constitution: smallest-scope decisions, one minimal contract extension explicitly justified by Clarification Q1 (recorded in Assumptions), no speculative abstractions.

**Post-design re-check (after Phase 1)**: **PASS** — design artifacts introduce no new scope beyond spec + clarifications; the contract extension remains the only change outside the frontend.

## Project Structure

### Documentation (this feature)

```text
specs/001-crowdfund-frontend-ui/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (on-chain interface + UI contracts)
│   ├── ICrowdFund.sol
│   ├── crowdfund-contract-interface.md
│   └── ui-state-contracts.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (specify/clarify output)
├── spec.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── public/
│   └── fonts/                      # self-hosted pixel fonts fallback assets
├── src/
│   ├── main.tsx
│   ├── App.tsx                     # retro desktop shell: menu/window manager
│   ├── config/
│   │   ├── chains.ts               # anvil (31337) dev + sepolia live
│   │   └── contracts.ts            # CrowdFund + token addresses per chain
│   ├── wagmi.ts                    # wagmi config, injected connector only
│   ├── abis/                       # CrowdFund.json / MockToken.json exported from forge out/
│   ├── components/
│   │   ├── retro/                  # design-system primitives (tokens → components)
│   │   │   ├── Window.tsx          # beveled window + navy TitleBar + controls
│   │   │   ├── Button.tsx          # bevel-out / pressed = bevel-in
│   │   │   ├── TextInput.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Dialog.tsx          # modal (login.dlg-style)
│   │   │   ├── ProgressBar.tsx     # retro funding progress
│   │   │   └── Terminal.tsx        # green-on-black scrollable action log
│   │   ├── campaigns/
│   │   │   ├── CampaignListWindow.tsx   # tabs + search + newest-first paging
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignDetailWindow.tsx
│   │   │   ├── LaunchForm.tsx
│   │   │   ├── PledgeForm.tsx
│   │   │   ├── UnpledgeControls.tsx
│   │   │   ├── ClaimButton.tsx
│   │   │   └── RefundButton.tsx
│   │   └── wallet/
│   │       └── ConnectButton.tsx   # connect/disconnect + account/network readout
│   ├── hooks/                      # useCampaigns, useCampaign, useMyContribution,
│   │                               # useTokenAllowance, useLaunch/Pledge/Unpledge/Claim/Refund
│   ├── lib/
│   │   ├── status.ts               # deriveStatus() — single source for FR-003 + tabs
│   │   ├── errors.ts               # revert-string → plain-language mapping (FR-013/SC-004)
│   │   ├── format.ts               # token decimals, big numbers, shortened addresses, times
│   │   └── validate.ts             # launch/pledge form rules mirroring contract (FR-006/008)
│   ├── styles/
│   │   ├── tokens.css              # 8/16-color palette, bevel widths, fonts, spacing
│   │   └── globals.css             # desktop background, focus-visible, text scaling (rem)
│   ├── types/
│   └── stores/
│       └── terminalStore.ts        # scrollable action-message history (FR-018)
└── tests/
    ├── unit/                       # Vitest + RTL (status, errors, validate, components)
    └── e2e/                        # Playwright flows against local Anvil

contracts/                          # existing, retained
├── src/
│   ├── CrowdFund.sol               # + title/description extension (Clarification Q1)
│   ├── interfaces/IERC20.sol
│   └── mocks/MockToken.sol
├── script/
│   └── Deploy.s.sol                # NEW: deploys MockToken + CrowdFund, writes addresses
├── test/
│   └── CrowdFund.t.sol             # NEW: existing behavior + title/description rules
├── foundry.toml
└── lib/                            # forge-std, openzeppelin-contracts (existing)
```

**Structure Decision**: Web application layout — new `frontend/` SPA alongside the existing `contracts/` (no backend; single deployable frontend + contracts already present). Specs remain under `specs/001-crowdfund-frontend-ui/`. The only contract-side work is the title/description extension plus its tests and a deploy script.

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified — **none**: the constitution is an unfilled template with no ratified gates (see Constitution Check).

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — (no violations) | — | — |
