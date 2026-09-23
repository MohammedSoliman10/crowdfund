# Research: Crowdfund Frontend UI (Phase 0)

**Feature**: `001-crowdfund-frontend-ui` | **Date**: 2026-09-23

All Technical Context unknowns resolved. Format: Decision / Rationale / Alternatives considered.

---

### R1. Frontend framework

- **Decision**: React 18+ with TypeScript, bundled by Vite (SPA).
- **Rationale**: Dominant ecosystem for EVM wallet libraries (wagmi hooks are React-first); SPA fits a single-surface dApp with no SEO/server rendering need; Vite gives instant dev feedback and trivial static builds for testnet hosting.
- **Alternatives considered**: Next.js (SSR/RSC adds routing/server complexity with zero benefit — wallet state is inherently client-side); Svelte/Vue (capable, but wagmi tooling and hiring familiarity favor React).

### R2. Chain interaction layer

- **Decision**: wagmi + viem + TanStack Query.
- **Rationale**: Typed contract reads/writes, `useReadContracts` for batched campaign fetches, built-in pending/confirmation lifecycle (drives FR-013 pending→success→failure), and `injected` connector matching Clarification Q2. TanStack Query (wagmi peer) provides cache/retry/refetch for FR-014 retry affordances.
- **Alternatives considered**: ethers v6 direct (manual loading/error plumbing, no query cache); web3.js (legacy); WalletConnect/web3-onboard (extra connectors — out of scope per Q2).

### R3. Wallet connection scope

- **Decision**: wagmi `injected` connector with `window.ethereum` detection; if absent, connect attempts show clear guidance (browse still works).
- **Rationale**: Clarification Q2 fixed scope to injected browser wallets only; satisfies FR-005 and the "no injected wallet installed" edge case.
- **Alternatives considered**: WalletConnect QR pairing (explicitly deferred by Q2); embedded email/social wallets (needs third-party service + backend-ish dependency, deferred by Q2).

### R4. Styling & design system

- **Decision**: Tailwind CSS driven by CSS custom-property design tokens (`styles/tokens.css`) plus a small set of bespoke retro primitives in `components/retro/`. Every interactive element is one of our primitives — platform-default controls never reach the screen.
- **Rationale**: The Chicago.95 reference is token-shaped: fixed 8/16-color palette, 2px bevel grammar (out/in), 0px radius, two font faces — map 1:1 to custom properties; Tailwind utilities keep usage consistent across ~6 windows; bespoke primitives guarantee SC-005's "zero unstyled default controls" and FR-019 hover/focus/pressed bevel inversion.
- **Alternatives considered**: Vanilla CSS (workable, more boilerplate for state variants); CSS-in-JS (runtime cost, no benefit here); MUI/Ant/Chakra (wrong aesthetic; fighting a component library to remove its defaults is worse than building 8 primitives).

### R5. Pixel fonts

- **Decision**: Self-host via `@fontsource` packages (VT323, Pixelify Sans, Silkscreen) with system-monospace fallbacks.
- **Rationale**: Reference names these exact faces; self-hosting avoids runtime CDN dependency (SC-006 3s load, offline-ish robustness) and keeps rendering deterministic for the design review (SC-005).
- **Alternatives considered**: Google Fonts CDN (external runtime dependency); generic `font-family` stacks (inconsistent pixel rendering breaks fidelity).

### R6. Campaign data retrieval (no backend)

- **Decision**: Read `count`, then batch `campaigns(id)` for a page via `useReadContracts`; read `pledgedAmount(id, account)` for the connected viewer; newest-first ordering computed client-side; status filter tabs + title search applied client-side over the fetched pages; "Load more" fetches the next id range. Events (`Launch`, `Pledge`, …) used to refresh/confirm and to narrate terminal messages.
- **Rationale**: Spec forbids backend/indexer (Assumptions); contract exposes direct id→struct mapping, so paged batched reads scale to hundreds of campaigns within SC-006; client-side filtering is instant (no freeze) for this data size.
- **Alternatives considered**: Subgraph/indexer (backend, out of scope); full-history `eth_getLogs` scan (slower, unnecessary when ids are enumerable); lazy per-campaign fetch (worse first paint).

### R7. Campaign text (title/description)

- **Decision**: Minimal contract extension — add `string title; string description;` to `Campaign`, extend `launch(...)` with both params, extend the `Launch` event, cap lengths (title ≤ 80, description ≤ 500 UTF-8 bytes) with require-messages, and cover with Forge tests.
- **Rationale**: Clarification Q1 chose on-chain text; the struct is already stored by value, adding two strings keeps a single source of truth with no backend; length caps bound gas and UI layout.
- **Alternatives considered**: Off-chain metadata registry (backend — rejected in Q1); browser-local text (visitors never see it — rejected in Q1); no text (anonymous listings — rejected in Q1).

### R8. Network configuration & address management

- **Decision**: `config/chains.ts` defines `anvil` (31337, dev default) and `sepolia` (live default per Clarification Q4); `config/contracts.ts` maps chain id → `{ crowdFund, pledgeToken }` populated from the Forge deploy script output; wagmi config exposes current chainId for FR-015 mismatch detection with a plain-language switch-guidance dialog.
- **Rationale**: Two fixed networks keep the mismatch rule trivially testable; a typed address map beats scattered env vars while still allowing env overrides at build time.
- **Alternatives considered**: Multi-chain selector UI (over-engineered for v1); env-only addresses (error-prone, no chain pairing); auto-add-unsupported-chains (hides mismatch instead of guiding, violates FR-015).

### R9. Error translation (plain-language failures)

- **Decision**: Two layers — (1) `lib/validate.ts` pre-flight mirrors of contract rules for specific, immediate messages (FR-006/FR-008); (2) `lib/errors.ts` revert-string → message map for on-chain failures (e.g., `"not creator"` → "Only the campaign creator can do this."), with a safe generic fallback for unknown reverts; every outcome appended to the terminal store (FR-018).
- **Rationale**: SC-004 demands 100% plain-language explanations; pre-flight validation also prevents needless wallet prompts.
- **Alternatives considered**: Raw revert strings surfaced to users (fails SC-004); global error boundary only (reacts too late, no specific rule named — fails SC-003).

### R10. Testing strategy

- **Decision**: Forge tests for contracts (existing behavior + extension); Vitest + RTL for pure logic (`status.ts`, `errors.ts`, `format.ts`, `validate.ts`) and retro primitives (bevel states, disabled-with-reason, terminal append); Playwright e2e driving an injected-wallet stub against a local Anvil node with deployed contracts for the six end-to-end flows (SC-007).
- **Rationale**: Each spec success criterion maps to a layer: SC-003/SC-004 → unit + e2e error paths; SC-007 → e2e totals verification via `cast`/viem reads; SC-005 → component snapshot/state review; SC-008 → keyboard-only e2e pass.
- **Alternatives considered**: Manual-only wallet testing (irreproducible, can't prove SC-007); contract tests via JS instead of Forge (slower, discards existing Foundry setup).

### R11. Status derivation (single source of truth)

- **Decision**: Pure function `deriveStatus(campaign, nowSeconds)` → `upcoming | live | successful | failed | cancelled`, plus `claimed` flag overlay; consumed by cards, detail view, filter tabs, and action-availability logic alike.
- **Rationale**: FR-003 statuses, FR-001 tabs, and FR-010/FR-011 action gates must never disagree (SC-007); a pure function is trivially unit-testable at boundaries (start-1s, end, end+1s).
- **Alternatives considered**: Per-component ad-hoc `if` logic (guaranteed drift between list tabs and buttons); deriving only from events (misses time-based transitions with no event).

### R12. Accessibility within retro fidelity

- **Decision**: Semantic HTML (buttons/labels/headings/dialog elements) beneath retro skins; `:focus-visible` outlines styled as navy dashed selection; all text in `rem` with a root-scale control for resizable text; contrast pairs checked from the token palette (navy-on-silver, green-on-black, black-on-teal) against WCAG AA — tokens adjusted only if a pair fails, preserving hue family.
- **Rationale**: FR-021/Clarification Q5 — fidelity wins visually, baseline a11y guaranteed; semantic elements give keyboard order and screen-reader structure for free (SC-008).
- **Alternatives considered**: ARIA-heavy div-based recreation (fragile, easy to fail SC-008); dropping contrast requirements (violates Q5 answer).

---

**Status**: All Technical Context unknowns resolved — no `NEEDS CLARIFICATION` remains in plan.md.
