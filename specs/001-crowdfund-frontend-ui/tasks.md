---

description: "Task list template for feature implementation"
---

# Tasks: Crowdfund Frontend UI

**Input**: Design documents from `/specs/001-crowdfund-frontend-ui/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. Contract tests are explicitly required by spec.md Assumptions ("testing that contract change is in scope"); frontend unit/e2e tests are defined by plan.md Testing (R10) and invoked by quickstart.md validation commands.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Web app** (per plan.md): `frontend/` (SPA) + `contracts/` (existing Foundry project) at repository root
- Feature docs: `specs/001-crowdfund-frontend-ui/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling — no product behavior yet

- [X] T001 Scaffold `frontend/` per plan.md structure: Vite + React + TypeScript (`frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`, `frontend/src/main.tsx`, placeholder `frontend/src/App.tsx`)
- [X] T002 [P] Install runtime dependencies in `frontend/`: react, react-dom, wagmi, viem, @tanstack/react-query, tailwindcss + postcss + autoprefixer, and self-hosted fonts @fontsource/vt323, @fontsource/pixelify-sans, @fontsource/silkscreen (research R2/R4/R5)
- [X] T003 [P] Configure ESLint + Prettier for `frontend/` (`frontend/.eslintrc.cjs`, `frontend/.prettierrc`)
- [X] T004 [P] Configure Vitest + React Testing Library for `frontend/` (`frontend/vitest.config.ts`, `frontend/tests/setup.ts`) with `test:unit` script in `frontend/package.json`
- [X] T005 [P] Configure Playwright for `frontend/` (`frontend/playwright.config.ts`) targeting a local Anvil RPC (127.0.0.1:8545, chain 31337) with `test:e2e` script in `frontend/package.json`
- [X] T006 [P] Wire Tailwind + PostCSS (`frontend/tailwind.config.ts` mapping design tokens from `frontend/src/styles/tokens.css`, `frontend/postcss.config.js`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract extension, design system, chain wiring, and shared logic that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Contract extension (Clarification Q1 — blocks ABI export & all stories)

- [X] T007 Extend `contracts/src/CrowdFund.sol` per `specs/001-crowdfund-frontend-ui/contracts/ICrowdFund.sol`: add `string title; string description;` to the `Campaign` struct (title non-empty ≤ 80 bytes, description non-empty ≤ 500 bytes — quote the constraints from ICrowdFund.sol), add both params to `launch(...)` with matching `require`s (messages: `title empty`, `description empty`, `title too long`, `description too long`), and extend the `Launch` event with `string title, string description`; all other behavior unchanged
- [X] T008 [P] Write Forge tests in `contracts/test/CrowdFund.t.sol` covering every existing rule (start/end/goal/duration guards, creator-only cancel/claim, pledge/unpledge windows, claim/refund conditions) AND the new title/description validation (empty, > 80 bytes, > 500 bytes, happy path) — explicitly required by spec Assumptions; run `cd contracts && forge test` green
- [X] T009 [P] Create deploy script `contracts/script/Deploy.s.sol` (Foundry script deploying `MockToken` then `CrowdFund(token)`, logging both addresses for `frontend/src/config/contracts.ts`), verified with `forge script` against local Anvil

### Design tokens & global styling (blocks all visible UI)

- [X] T010 [P] Create design tokens `frontend/src/styles/tokens.css` per `specs/001-crowdfund-frontend-ui/contracts/ui-state-contracts.md` §5: 8/16-color palette (Teal `#008080`, Navy `#000080`, Silver `#C0C0C0`, White, Black, Yellow `#FFFF00`, terminal Green, Alert Red), bevel grammar (2px `bevel-out`/`bevel-in`, radius 0), font families (VT323 console, Pixelify Sans/Silkscreen display)
- [X] T011 [P] Create `frontend/src/styles/globals.css`: teal desktop background, `rem`-based text with root scaling control (resizable text), `:focus-visible` = navy dashed outline on all controls, dashed multicolor accent rule, scrollbar styling
- [X] T012 [P] Import the three @fontsource pixel fonts in `frontend/src/main.tsx` (with system-monospace fallbacks)

### Chain & wallet wiring (blocks all reads/writes)

- [X] T013 [P] Create `frontend/src/config/chains.ts`: anvil (id 31337, dev default) and sepolia (id 11155111, live default) per Clarification Q4
- [X] T014 [P] Create `frontend/src/config/contracts.ts`: typed chainId → `{ crowdFund, pledgeToken }` address map, env-overridable, placeholders until T009 deploy
- [X] T015 Run `forge build` and export `CrowdFund` + `MockToken` ABIs into `frontend/src/abis/CrowdFund.json` and `frontend/src/abis/MockToken.json` *(depends: T007)*
- [X] T016 Create `frontend/src/wagmi.ts`: wagmi `createConfig` with **injected connector only** (Clarification Q2), chains from T013, ABIs from T015; wrap app in `WagmiProvider` + `QueryClientProvider` in `frontend/src/main.tsx`

### Retro primitives (blocks all screens — design authority)

- [X] T017 [P] Create `frontend/src/components/retro/Window.tsx` (+ TitleBar): silver beveled body, navy title bar, white title text, 3D window control buttons (min/max/close) — ui-state-contracts §3
- [X] T018 [P] Create `frontend/src/components/retro/Button.tsx`: variants default/primary/danger; states enabled/hover/focus-visible/pressed (pressed **inverts** bevel, FR-019); `disabled` prop REQUIRES a visible plain-language `reason` rendered alongside (FR-012)
- [X] T019 [P] Create `frontend/src/components/retro/TextInput.tsx`: bevel-in field, VT323 console font, label association, error text slot
- [X] T020 [P] Create `frontend/src/components/retro/Checkbox.tsx`: retro checkbox with bevel states, keyboard-operable (semantic `<input type="checkbox">` beneath)
- [X] T021 [P] Create `frontend/src/components/retro/Dialog.tsx`: modal window, Esc + close control, focus moves in on open and returns to trigger on close (ui-state-contracts §3)
- [X] T022 [P] Create `frontend/src/components/retro/ProgressBar.tsx`: bevel-in trough, blocky fill, exact amount + pct label, graceful >100% ("100%+" bar, exact label)
- [X] T023 [P] Create `frontend/src/components/retro/Terminal.tsx` + `frontend/src/stores/terminalStore.ts`: append-only session log, severity styles (info/success/error), always-scrollable history (FR-018)

### Shared logic (blocks all stories)

- [X] T024 [P] Implement `frontend/src/lib/status.ts` — pure `deriveStatus(campaign, nowSeconds)` exactly per data-model state machine (upcoming/live/successful/failed + cancelled overlay + claimed marker); unit tests in `frontend/tests/unit/status.test.ts` covering boundaries (start−1s, start, end, end+1s, cancelled creator=0)
- [X] T025 [P] Implement `frontend/src/lib/format.ts` — token decimal formatting, large-number readability, shortened addresses with full value retrievable, relative timing labels (FR-004); unit tests in `frontend/tests/unit/format.test.ts`
- [X] T026 [P] Implement `frontend/src/lib/errors.ts` — the complete revert→plain-language map from `specs/001-crowdfund-frontend-ui/contracts/crowdfund-contract-interface.md` (all 23 entries incl. safe generic fallback); unit tests in `frontend/tests/unit/errors.test.ts` (SC-004)
- [X] T027 Create `frontend/src/hooks/useWalletSession.ts` + `frontend/src/components/wallet/ConnectButton.tsx`: state machine disconnected/connecting/connected/no-wallet + wrong-network guidance (FR-005, FR-015, ui-state-contracts §1); account/network readout, disconnect; unit tests in `frontend/tests/unit/wallet-session.test.ts`
- [X] T028 [P] Implement `frontend/src/lib/actions.ts` — single shared `getActionAvailability(campaign, session, viewerContribution)` returning `{ enabled, reason }` per data-model action-eligibility matrix (components may NOT re-implement rules, ui-state-contracts §4); unit tests in `frontend/tests/unit/actions.test.ts` *(depends: T024)*
- [X] T029 [P] Create e2e harness `frontend/tests/e2e/helpers/`: injected-wallet stub fixture, local Anvil session fixture, token mint helper, time-warp helper (`anvil_setNextBlockTimestamp`), terminal-log assertions *(depends: T005)*

**Checkpoint**: Foundation ready — contract extended & tested, design system + wallet + shared logic complete; user story implementation can now begin (in parallel if staffed)

---

## Phase 3: User Story 1 - Browse and evaluate campaigns (Priority: P1) 🎯 MVP

**Goal**: Anonymous visitor lands on the retro desktop and discovers/evaluates campaigns (title, description, goal, progress, schedule, status) with tabs/search/paging — no wallet required

**Independent Test**: Disconnect wallet, open app: campaigns listed newest-first with all data; filter tabs + title search + Load more work; open detail for full info; empty/loading/error states behave (spec US1 acceptance scenarios 1–6)

### Implementation for User Story 1

- [X] T030 [P] [US1] Create view-model types `frontend/src/types/index.ts` — `CampaignCardVM`, `CampaignDetailVM`, `TerminalMessageVM`, `ConnectButtonVM` exactly per `contracts/ui-state-contracts.md` §2
- [X] T031 [US1] Implement `frontend/src/hooks/useCampaigns.ts` — read `count()` + batched `campaigns(id)` pages, newest-first ordering, `dataState` loading/ready/error with refetch (FR-001, FR-014, research R6) *(depends: T016, T024 — i.e., after wagmi config and status lib)*
- [X] T032 [P] [US1] Create `frontend/src/components/campaigns/CampaignCard.tsx` — title + description snippet, goal/pledged formatted labels, `ProgressBar`, status badge from `deriveStatus`, timing label *(depends: T030)*
- [X] T033 [US1] Create `frontend/src/components/campaigns/CampaignListWindow.tsx` — status filter tabs (All/Upcoming/Live/Successful/Failed), case-insensitive title search, "Load more" paging, and all four data states: empty-catalogue message, empty-result message, loading indicator, error + retry (FR-001, FR-014, SC-006) *(depends: T031, T032)*
- [X] T034 [US1] Implement `frontend/src/hooks/useCampaign.ts` — single campaign + viewer's `pledgedAmount` outstanding when connected (FR-002) *(depends: T016)*
- [X] T035 [US1] Create `frontend/src/components/campaigns/CampaignDetailWindow.tsx` — full description, creator shortened with full value on demand, timing, status, personal contribution (if connected), claim/refund eligibility via shared `getActionAvailability`, and a fund-action entry point that prompts wallet connection when disconnected (FR-002, US1 scenario 3) *(depends: T028, T034)*
- [X] T036 [US1] Build the desktop shell `frontend/src/App.tsx` — teal desktop, dashed accent header, windowed navigation between list and detail views, `ConnectButton` in the top bar, `Terminal` docked (FR-017) *(depends: T017, T027, T033, T035)*
- [X] T037 [P] [US1] Component tests `frontend/tests/unit/campaign-list.test.tsx` — renders card data, tab filtering, search matching, empty/loading/error states (RTL)
- [X] T038 [US1] E2E `frontend/tests/e2e/us1-browse.spec.ts` — quickstart scenarios 1–3 + 14: browse without wallet, filter/search/Load-more with no freeze, detail view, no-wallet-installed guidance *(depends: T029, T036)*

**Checkpoint**: User Story 1 fully functional and testable independently — **MVP deliverable**

---

## Phase 4: User Story 2 - Fund a campaign (Priority: P2)

**Goal**: Backer connects (injected wallet), pledges to a live campaign with approve flow, tracks and un-pledges their contribution — all feedback through the terminal

**Independent Test**: With a funded wallet: pledge during live window → totals & personal stake increase only after confirmation; rejections show specific plain-language messages; unpledge returns tokens; ended campaign disables both with reasons (spec US2 acceptance scenarios 1–5)

### Implementation for User Story 2

- [X] T039 [P] [US2] Implement pledge validation in `frontend/src/lib/validate.ts` — amount > 0, ≤ token balance, allowance covered, within `[startAt, endAt]` window (mirrors contract, research R9); unit tests in `frontend/tests/unit/validate-pledge.test.ts` *(depends: T025)*
- [X] T040 [P] [US2] Create `frontend/src/hooks/useToken.ts` — `useTokenBalance`, `useAllowance`, approve-with-progress helper (approve only when allowance < amount) *(depends: T016)*
- [X] T041 [US2] Implement `frontend/src/hooks/usePledge.ts` — pre-flight validation → approve-if-needed → `pledge(id, amount)`; lifecycle idle/submitting/pending/confirmed/error posting terminal messages; refetch totals only after confirmation; blocks double-submit (FR-008, FR-013, FR-016) *(depends: T026, T040)*
- [X] T042 [US2] Implement `frontend/src/hooks/useUnpledge.ts` — amount ≤ outstanding, before end; terminal messages; refetch after confirmation (FR-009) *(depends: T026)*
- [X] T043 [US2] Create `frontend/src/components/campaigns/PledgeForm.tsx` — Dialog + TextInput amount entry, live validation messages naming the specific rule, connect prompt when disconnected, disabled+reason states, pending state (SC-002) *(depends: T021, T041)*
- [X] T044 [US2] Create `frontend/src/components/campaigns/UnpledgeControls.tsx` — shows outstanding stake, partial/full withdraw, disabled with reason after end or when nothing to withdraw *(depends: T042)*
- [X] T045 [P] [US2] Component tests `frontend/tests/unit/fund.test.tsx` — pledge validation rendering, rejection messages, disabled+reason states, unpledge bounds
- [X] T046 [US2] E2E `frontend/tests/e2e/us2-fund.spec.ts` — quickstart scenarios 6–9: connect prompt before wallet popup, pledge success with totals verified via viem, all rejection messages, unpledge partial then full *(depends: T038, T043, T044)*

**Checkpoint**: Stories 1 AND 2 both work independently

---

## Phase 5: User Story 3 - Creator lifecycle and refunds (Priority: P3)

**Goal**: Creator launches (with on-chain title/description), cancels before start, claims after success; backers refund after failure — full funding loop closed

**Independent Test**: Launch valid/invalid forms (each rule named), cancel as creator only, time-warp to end → claim on goal-met, refund on goal-missed; duplicate attempts blocked with explanations (spec US3 acceptance scenarios 1–6)

### Implementation for User Story 3

- [X] T047 [P] [US3] Implement launch validation in `frontend/src/lib/validate.ts` — **title non-empty ≤ 80 bytes**, **description non-empty ≤ 500 bytes**, **goal > 0**, **start time not in the past**, **end ≥ start**, **end ≤ now + 90 days** (constraints quoted verbatim from data-model.md); unit tests in `frontend/tests/unit/validate-launch.test.ts`
- [X] T048 [US3] Implement `frontend/src/hooks/useLaunch.ts` — `launch(goal, startAt, endAt, title, description)` with pending→confirmed lifecycle, terminal messages, list refresh (SC-003) *(depends: T026, T047)*
- [X] T049 [US3] Create `frontend/src/components/campaigns/LaunchForm.tsx` — Dialog with title/description/goal/start/end fields (TextInput + Checkbox acknowledgment), rejects invalid submissions naming the specific violated rule, nothing submitted on rejection (FR-006, US3 scenario 2) *(depends: T048)*
- [X] T050 [P] [US3] Create `frontend/src/hooks/useCancel.ts` + `frontend/src/components/campaigns/CancelButton.tsx` — creator-only, upcoming-only, disabled with reason otherwise (FR-007) *(depends: T028, T026)*
- [X] T051 [P] [US3] Create `frontend/src/hooks/useClaim.ts` + `frontend/src/components/campaigns/ClaimButton.tsx` — enabled only for creator on successful-unclaimed campaigns; disabled+reason for all other states (FR-010) *(depends: T028, T026)*
- [X] T052 [P] [US3] Create `frontend/src/hooks/useRefund.ts` + `frontend/src/components/campaigns/RefundButton.tsx` — failed campaigns only, shows refundable amount, disabled+reason otherwise, "nothing to refund" message for zero stake (FR-011, US3 scenario 6) *(depends: T028, T026)*
- [X] T053 [US3] Wire creator/backer actions into `frontend/src/components/campaigns/CampaignDetailWindow.tsx` — Launch entry (opens LaunchForm) surfaced app-wide, cancel/claim/refund buttons with eligibility + completion markers (claimed/refunded) per FR-003 *(depends: T049, T050, T051, T052)*
- [X] T054 [P] [US3] Unit tests `frontend/tests/unit/launch-lifecycle.test.tsx` — every launch rule's named error, eligibility matrix paths for cancel/claim/refund (all disabled reasons)
- [X] T055 [US3] E2E `frontend/tests/e2e/us3-lifecycle.spec.ts` — quickstart scenarios 4–5, 10–12: invalid launches (each rule), valid launch appears Upcoming, cancel + non-creator rejection, time-warp claim (single use), refund flow *(depends: T046, T053)*

**Checkpoint**: All four user stories' functional requirements independently testable

---

## Phase 6: User Story 4 - Retro interface identity and action feedback (Priority: P4)

**Goal**: Cross-cutting fidelity + accessibility guarantee — every screen matches the reference image, every action narrated in the terminal, every flow keyboard-operable

**Independent Test**: Design review vs reference (zero unstyled defaults), terminal has ≥1 plain-language message per attempted action, complete one full flow keyboard-only with visible focus (spec US4 acceptance scenarios 1–5)

### Implementation for User Story 4

- [X] T056 [US4] Fidelity audit + fixes across `frontend/src/components/**` and `frontend/src/App.tsx` vs the reference image: teal desktop, navy title bars with window controls, beveled chrome, 8/16-color palette, pixel typography, dashed multicolor accents, pressed-bevel inversion — eliminate any unstyled platform-default control (FR-017, FR-019, SC-005)
- [X] T057 [US4] Terminal feedback audit + fixes in `frontend/src/stores/terminalStore.ts` and all write hooks — ≥1 plain-language message per attempted action (pending/success/failure), history scrollable and preserved, no raw revert strings ever visible (FR-018, SC-004)
- [X] T058 [US4] Accessibility pass + fixes in `frontend/src/styles/globals.css` and `frontend/src/components/retro/*` — full keyboard operability, visible `:focus-visible` everywhere, verify AA contrast of token pairs (navy-on-silver, black-on-teal, green-on-black, white-on-navy) adjusting token shades only within hue family if any fails, resizable text without clipping (FR-021, SC-008)
- [X] T059 [P] [US4] E2E keyboard-only pass `frontend/tests/e2e/us4-keyboard-a11y.spec.ts` — browse → fund → launch completed using only Tab/Enter/Space with focus assertions at each step *(depends: T058)*
- [X] T060 [US4] Responsive verification + fixes for narrow laptop → wide desktop across `frontend/src/components/**` — no overlapping/clipped content, controls remain clickable (FR-020, US4 scenario 4)

**Checkpoint**: Spec feature complete — all 4 stories + cross-cutting requirements done

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Hardening and validation across all stories

- [X] T061 [P] Performance pass on `frontend/src/hooks/useCampaigns.ts` + `frontend/src/components/campaigns/CampaignListWindow.tsx`: first usable list < 3s on home broadband, filter/search/Load-more show no perceptible freeze at hundreds of campaigns; retry affordance on failure (SC-006)
- [X] T062 [P] Production gate: `cd frontend && npm run build && npm run lint && npm run test:unit` all clean; `cd contracts && forge test` green (SC-007 prerequisites)
- [X] T063 [P] Write `frontend/README.md`: setup, local anvil + deploy + address wiring, wallet/network config, test commands, testnet deployment (mirrors quickstart.md)
- [X] T064 Security hygiene sweep in `frontend/src/config/*` and `frontend/src/lib/errors.ts`: no private keys/secrets in bundle, address map env-overridable, unknown errors fall back to generic message with detail only in terminal log (research R8/R9)
- [X] T065 Run full `specs/001-crowdfund-frontend-ui/quickstart.md` validation (all 17 scenarios, forge test, unit, e2e, build) and record pass/fail per Success Criterion SC-001…SC-008
- [X] T066 [P] Final consistency review: walk spec.md FR-001…FR-021 against implemented behavior; verify `specs/001-crowdfund-frontend-ui/checklists/requirements.md` remains 15/15 and note any gaps discovered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**. Internal order: T007 → T015 → T016 (contract extension → ABI export → wagmi config); T024 → T028 (status before action matrix); everything else parallelizable
- **User Stories (Phase 3–6)**: All depend on Foundational completion
  - **US1 (P1)**: no dependency on other stories → MVP
  - **US2 (P2)**: needs US1's `CampaignDetailWindow` (T035) as its host surface; independently testable once US1 exists
  - **US3 (P3)**: needs US1 surface; wires alongside US2 controls (T053 after T035)
  - **US4 (P4)**: audit/fix pass over whatever US1–US3 produced → runs last (T056–T060 after all functional tasks); T059 needs T058
- **Polish (Phase 7)**: Depends on all stories being complete (T065 runs the whole quickstart)

### User Story Dependencies

- **US1 (P1)**: starts after Foundational — no story dependencies
- **US2 (P2)**: starts after Foundational; integrates with US1 detail view (T035) but all its own tasks are separable; e2e T046 chains after T038 for shared-harness stability
- **US3 (P3)**: starts after Foundational; T053 integrates with US1/US2 components
- **US4 (P4)**: audit phase — begins after US1–US3 functional tasks; its fixes touch files owned by earlier stories (expected — it is the cross-cutting quality gate)

### Within Each User Story

1. Validation/lib + hooks first, then components, then shell wiring
2. Unit tests [P] alongside implementation
3. Story e2e last (asserts the full story path)
4. Story complete + checkpoint before moving to next priority

### Parallel Opportunities

- **Setup**: T002–T006 all parallel (different config files)
- **Foundational**: T008/T009 ∥ (contract tests ∥ deploy script) · T010/T011/T012 ∥ · T013/T014 ∥ · T017–T023 all 7 primitives ∥ · T024/T025/T026 ∥ (independent lib files) · T028 ∥ T027
- **US1**: T030 ∥ T032 (after types: T032 ∥ T033-prep), T037 ∥ T031/T034
- **US2**: T039 ∥ T040, T045 ∥ implementation tasks
- **US3**: T047 ∥ T048-prep; T050 ∥ T051 ∥ T052 (different files), T054 ∥ T053
- **US4**: T059 ∥ T060 (different files after T058)
- **Polish**: T061 ∥ T062 ∥ T063 ∥ T066
- **Across stories**: once Foundational + US1 land, US2 and US3 task streams can proceed in parallel (different components/hooks; both host into T035/T053)

---

## Parallel Example: User Story 1

```bash
# Immediately after Foundational checkpoint — launch together:
Task: "T030 [P] [US1] Create view-model types frontend/src/types/index.ts"
Task: "T037 [P] [US1] Component tests frontend/tests/unit/campaign-list.test.tsx"

# Then, once types exist:
Task: "T032 [P] [US1] Create CampaignCard frontend/src/components/campaigns/CampaignCard.tsx"
Task: "T034 [US1] Implement useCampaign frontend/src/hooks/useCampaign.ts"   # different file than T032
```

## Parallel Example: User Story 2

```bash
# Launch together after US1 surface exists:
Task: "T039 [P] [US2] pledge validation frontend/src/lib/validate.ts"
Task: "T040 [P] [US2] useToken frontend/src/hooks/useToken.ts"
Task: "T045 [P] [US2] component tests frontend/tests/unit/fund.test.tsx"   # stubs against contracts
```

## Parallel Example: User Story 3

```bash
# Launch together (three different component+hook pairs):
Task: "T050 [P] [US3] useCancel + CancelButton frontend/src/hooks/useCancel.ts ..."
Task: "T051 [P] [US3] useClaim + ClaimButton frontend/src/hooks/useClaim.ts ..."
Task: "T052 [P] [US3] useRefund + RefundButton frontend/src/hooks/useRefund.ts ..."
```

## Parallel Example: User Story 4

```bash
# After T058 accessibility fixes land:
Task: "T059 [P] [US4] E2E keyboard pass frontend/tests/e2e/us4-keyboard-a11y.spec.ts"
Task: "T060 [US4] Responsive fixes frontend/src/components/**"   # different files than T059
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T006)
2. Complete Phase 2: Foundational (T007–T029) — **CRITICAL, blocks all stories**
3. Complete Phase 3: User Story 1 (T030–T038)
4. **STOP and VALIDATE**: quickstart scenarios 1–3 + 14, unit tests, forge test
5. Demo-ready: retro desktop browse experience is the deliverable

### Incremental Delivery

1. Setup + Foundational → foundation ready (contract extended & tested, design system + wallet + shared logic live)
2. Add US1 → test independently → **Deploy/Demo (MVP!)**
3. Add US2 → test independently (e2e us2-fund) → Demo
4. Add US3 → test independently (e2e us3-lifecycle) → Demo — full funding loop
5. Add US4 → fidelity/a11y gate → polish → **quickstart full validation = done**

### Parallel Team Strategy

1. Team completes Setup + Foundational together (contract dev ∥ frontend primitives)
2. Once Foundational is done: Developer A = US1 (must land first as host surface), Developer B = US2 lib/hooks (T039–T042), Developer C = US3 lib/hooks (T047–T052) — all different files
3. Integrate B/C controls into detail view (T045/T053), then US4 audit, then Polish

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability (US1–US4 from spec.md)
- Each user story is independently completable and testable; checkpoints mark validation points
- Commit after each task or logical group; stop at any checkpoint to validate that story alone
- Avoid: vague tasks, same-file conflicts (note: `validate.ts` is touched by US2 T039 and US3 T047 — sequential across stories, do not parallelize those two), cross-story dependencies that break independence
- Contract-side tasks (T007–T009) intentionally sit in Foundational: the title/description extension blocks every story's display of campaign text (Clarification Q1)

---

## Validation Record (T065) — run 2026-09-23

Automated gates (all executed against a fresh Anvil + full deploy + `scripts/seed.mjs`, verified by `scripts/verify.mjs` → `VERIFY OK`, tally `{upcoming:11, successful:1, live:1, failed:1}`):

| Gate | Command | Result |
|------|---------|--------|
| Contract tests | `cd contracts && forge test` | **PASS** — 31/31 |
| Types | `npm run typecheck` | **PASS** — 0 errors |
| Lint | `npm run lint` | **PASS** — 0 problems |
| Unit tests | `npm run test:unit` | **PASS** — 144/144 (12 files) |
| Production build | `npm run build` | **PASS** — `dist/` built, zero type errors |
| E2E (all 4 spec files) | `npm run test:e2e` | **PASS** — 20/20 in 16.2s |
| Security sweep (T064) | grep `src/` + `dist/` for keys/mnemonics | **PASS** — none; address map env-overridable; unknown errors → generic UI message with detail only in terminal |

Quickstart scenario coverage (scenarios 1–15 + 17 fully automated by e2e; scenario 16 automated proxies + reviewer-owned human review):

| Scenario | Automated evidence | Result |
|----------|-------------------|--------|
| 1 browse w/o wallet | us1-browse e2e | PASS |
| 2 filter/search/load-more, no freeze | us1-browse e2e + perf test (<3s load, <1.5s filter) | PASS |
| 3 campaign detail | us1-browse e2e | PASS |
| 4 launch invalid (each rule) | us3-lifecycle e2e + launch-lifecycle unit (9 rules named) | PASS |
| 5 launch valid | us3-lifecycle e2e (pending → confirmed → appears Upcoming) | PASS |
| 6 fund prompts connect first | us1-browse e2e (disabled + reason, no wallet) + wallet-session unit | PASS |
| 7 pledge success + totals | us2-fund e2e (auto-approve → totals/stake/balance asserted post-confirm) | PASS |
| 8 pledge rejections | us2-fund e2e (pre-flight balance rejection, no tx) + validate-pledge unit | PASS |
| 9 unpledge part/full + bound | us2-fund e2e + fund unit | PASS |
| 10 cancel creator-only | us3-lifecycle e2e (cancel hides; non-creator reason asserted) | PASS |
| 11 claim single-use | us3-lifecycle e2e (second claim gated) | PASS |
| 12 refund + zero-stake message | us2-fund e2e (refund then "nothing to refund") | PASS |
| 13 wrong network | us2-fund e2e (`chainId 0x1` stub → warning + "switch to continue") | PASS |
| 14 no wallet installed | us1-browse e2e (no-wallet notice) | PASS |
| 15 keyboard-only pass | us4 e2e T059 (Tab/Enter connect → search → pledge → launch dialog, focus trapped) | PASS |
| 16 design review | automated proxies: AA-contrast pairs, zero animations, bevel/palette tests | PASS (automated) — human ≥90% review remains reviewer-owned in quality.md |
| 17 data integrity | us2/us3 e2e post-action totals + `verify.mjs` assertions | PASS |

Success-criteria outcomes:

- **SC-001** PASS — goal/progress/end visible on first paint <3s (perf e2e; user-study percentages are manual QA).
- **SC-002** PASS — connect-and-fund flow e2e green end-to-end; completion-rate/time metrics are manual QA.
- **SC-003** PASS — 9/9 launch rules named pre-flight with nothing sent; valid launch e2e green.
- **SC-004** PASS — every blocked path carries a plain-language reason (Button contract + matrix unit tests + e2e reason assertions; 23-entry revert map, generic fallback).
- **SC-005** PASS (automated evidence) — fidelity covered by contrast/fidelity e2e; human reference-image review left to reviewer (quality.md).
- **SC-006** PASS — first usable <3s, filter <1.5s, retry affordance on read error.
- **SC-007** PASS — post-confirmation totals/stakes/balances asserted in e2e and `verify.mjs`; zero discrepancies.
- **SC-008** PASS — keyboard-only full flow, visible focus ring, 150% text resize without clipping, WCAG-AA pairs.

Note: `checklists/quality.md` (34 items) is intentionally left entirely unchecked — reviewer-owned; its gate was bypassed by explicit user instruction ("Yes, proceed").

## Consistency Review (T066)

FR walk — spec.md FR-001…FR-021 vs implemented behavior:

- **FR-001** ✓ `CampaignListWindow` + `useCampaigns`: newest-first, 5 status tabs, title search, Load-more, all four data states → us1 e2e.
- **FR-002** ✓ `CampaignDetailWindow` + `useCampaign`: description, creator (shortened, full on hover), time remaining, viewer stake, claim/refund eligibility → us1/us2 e2e.
- **FR-003** ✓ `deriveStatus`: upcoming/live/successful/failed + cancelled (excluded from lists, stale-id detail shows cancelled panel) + claimed/refunded markers → status unit (boundary tests) + chips/tags.
- **FR-004** ✓ `format.ts`: decimals, compact large numbers, shortened addresses with full value on `title` → format unit (14).
- **FR-005** ✓ `useWalletSession` + `ConnectButton`: browse anonymously, injected-only connect/disconnect, account+network readout, connect prompt before every write → us1/us2 e2e.
- **FR-006** ✓ `validate/launch`: title/description/goal/start/end/max-duration rules each named → launch-lifecycle unit + us3 e2e.
- **FR-007** ✓ matrix: creator-only, upcoming-only cancel (+ contract guard) → us2/us3 e2e.
- **FR-008** ✓ pledge pipeline: window check, balance/allowance pre-flight, pending state, totals updated only post-receipt → us2 e2e.
- **FR-009** ✓ unpledge ≤ outstanding, before end (+ contract guard) → us2 e2e + fund unit.
- **FR-010** ✓ claim: creator + ended + goal-met + once → matrix + us3 e2e.
- **FR-011** ✓ refund: failed-only, refundable amount shown, zero-stake explanation → matrix + us2 e2e.
- **FR-012** ✓ `Button` renders a required plain-language `reason` whenever disabled (dev-time console.error enforcement) → matrix unit + e2e reason assertions.
- **FR-013** ✓ loading/pending/success/failure feedback; 23-entry revert→plain-language map with generic fallback → errors unit + write-pipeline logs.
- **FR-014** ✓ empty/loading/error states + retry on the list → us1 e2e.
- **FR-015** ✓ wrong-network banner + "switch to continue" gate; Sepolia live target, Anvil dev (env-overridable addresses) → us2 e2e wrong-network.
- **FR-016** ✓ double-submit prevention: `isPending` disables submits with a "Waiting…" reason → fund unit + forms.
- **FR-017** ✓ retro system: teal desktop, navy title bars + window controls, bevels, 8/16 palette, pixel fonts, dashed accents → primitives + fidelity e2e (human review reviewer-owned).
- **FR-018** ✓ green-on-black `Terminal` (`role="log"`, `aria-live="polite"`, scrollable history); severity colors verified (camelCase-class bug found & fixed during contrast test) → us1 e2e.
- **FR-019** ✓ hover/focus/pressed states, pressed inverts bevel → CSS/Globals; focus ring asserted in us4 e2e.
- **FR-020** ✓ desktop-first, `lg`/`xl` breakpoints → FR-020 responsive e2e: 1024/1440/1920, zero horizontal overflow, controls clickable, 2-column at ≥1024.
- **FR-021** ✓ keyboard-only operation, visible focus, AA contrast pairs, 150% resize without clipping → us4 e2e suite.

**requirements.md**: all **16/16** items remain checked — PASS (task text says 15/15; the file actually contains 16 checks, none unmet). No spec gaps discovered.

### Implementation notes (path deviations from task text — behavior identical)

- Validation lives in `src/lib/validate/{launch,pledge}.ts` (task said single `validate.ts`).
- Write hooks consolidated in `src/hooks/useCampaignActions.ts` (tasks said separate `useLaunch/usePledge/useUnpledge/useCancel/useClaim/useRefund.ts`); forms live in `src/components/actions/` (tasks said `campaigns/`), launch dialog is `components/launch/LaunchDialog.tsx` (task said `LaunchForm.tsx` **with a Checkbox acknowledgment** — the spec's FR-006 requires no acknowledgment, so none was added; the `Checkbox` primitive exists per T020 but is currently unused).
- Cancel/Claim/Refund are inline sections of `CampaignDetailWindow` driven by one shared availability matrix (vs. three separate button components).
- Timing/status/writes use **chain time** (`useChainNow` → `block.timestamp`) rather than wall clock — required because the contract compares `startAt >= block.timestamp` and the dev chain is warped ahead.
- E2E file names match this task list (`us1-browse`, `us2-fund`, `us3-lifecycle`, `us4-keyboard-a11y`); mint/time-warp helpers live in `scripts/seed.mjs` (fixtures are pre-seeded) instead of the e2e helper module.
