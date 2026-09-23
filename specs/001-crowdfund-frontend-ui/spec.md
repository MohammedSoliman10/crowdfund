# Feature Specification: Crowdfund Frontend UI

**Feature Branch**: `001-crowdfund-frontend-ui`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "i want you to build this project from the code in this folder its about crowd fund , you will build the ui and frontend , [Image 1] this image is gonna be your refrance to build the ui"

## Clarifications

### Session 2026-09-23

- Q: Where should a campaign's title and description come from, given the current contract stores only numbers and no campaign text? → A: Extend the contract to store a campaign title + description on-chain (relaxes the "contract unchanged" assumption; contract tests required).
- Q: Which wallet connection methods must the v1 interface support? → A: Injected browser wallets only.
- Q: How should the campaign list behave as the number of campaigns grows — what ordering, filtering, and search should visitors get? → A: Newest-first list with status filter tabs (All / Upcoming / Live / Successful / Failed), a title search box, and "Load more" paging.
- Q: Which network should v1 target as its default home, given the app must detect and guide users whose wallet is on the wrong network (FR-015)? → A: Public testnet as the live target, with a local development chain used while building.
- Q: When the retro reference clashes with accessibility — tiny pixel fonts and an 8-color palette — what standard must the v1 interface meet? → A: Full retro fidelity plus baseline accessibility: complete keyboard operation, visible focus states, WCAG-AA text contrast where achievable, resizable text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and evaluate campaigns (Priority: P1)

A visitor opens the crowdfunding app and lands on a retro "desktop" workspace: a teal background on which campaign listings appear as silver, beveled windows with navy title bars. Each campaign window shows its title and short description, the funding goal, how much has been pledged so far, a progress indicator, the start/end schedule, and a plain-language status. The visitor can open a campaign to see full details — description, creator, time remaining, and their own contribution if they have backed it before — all without connecting a wallet. A large catalogue stays navigable through newest-first ordering, status filter tabs, title search, and on-demand paging.

**Why this priority**: This is the entry point for every other journey. It delivers value (discovering and evaluating campaigns) to anonymous visitors and forms the surface every other action builds on. It is the standalone MVP.

**Independent Test**: With no wallet connected, open the app and verify that existing campaigns are listed with title, goal, pledged amount, progress, schedule, and status; filter by a status tab, search by title, and open one campaign's detail view to verify full information is shown.

**Acceptance Scenarios**:

1. **Given** campaigns exist, **When** a visitor opens the app, **Then** each campaign's title, goal, pledged total, progress percentage, schedule, and status are visible without requiring a wallet connection.
2. **Given** a campaign whose start time is in the future, **When** the visitor views it, **Then** it is labeled as upcoming and funding actions are visibly disabled.
3. **Given** a live campaign, **When** the visitor opens its detail view, **Then** the remaining time and "live" status are shown and a fund action is offered that prompts wallet connection when none is connected.
4. **Given** a campaign that was cancelled by its creator, **When** the visitor views the listings, **Then** it is marked as cancelled (or excluded) and cannot be funded.
5. **Given** no campaigns exist, **When** the visitor opens the app, **Then** a friendly empty-state message is displayed instead of a blank screen.
6. **Given** more campaigns than fit one page, **When** the visitor browses the list, **Then** campaigns appear newest-first, can be narrowed by the status filter tabs (All / Upcoming / Live / Successful / Failed) and by title search, and further campaigns load on demand without freezing the screen; a search with no matches shows a clear empty-result message.

---

### User Story 2 - Fund a campaign (Priority: P2)

A backer connects their wallet, chooses an amount, and pledges it to a live campaign. They can then track their own contribution on the campaign, and unpledge (withdraw all or part of their contribution) while the campaign is still running.

**Why this priority**: Funding is the core purpose of a crowdfunding platform. Without it there is no product, but it depends on Story 1's browsing surface to be meaningful.

**Independent Test**: Connect a wallet with token balance, pledge an amount to a live campaign, verify the campaign totals and the personal contribution update after confirmation, then unpledge and verify the tokens return.

**Acceptance Scenarios**:

1. **Given** no wallet is connected, **When** a visitor chooses to fund a campaign, **Then** they are guided to connect a wallet first and no transaction is attempted.
2. **Given** a connected wallet with sufficient token balance and spending permission, **When** the backer submits a pledge during the campaign's active window, **Then** a pending state is shown, and after confirmation the campaign total, progress, and the backer's own contribution all increase by the pledged amount with a success confirmation.
3. **Given** insufficient balance, insufficient spending permission, an amount outside allowed bounds, or a time window that does not permit funding, **When** the backer submits, **Then** a specific plain-language message is shown and no funds move.
4. **Given** a backer has an outstanding contribution before the campaign ends, **When** they unpledge an amount up to their contribution, **Then** their tokens are returned, their contribution and the campaign total decrease accordingly, and a confirmation is shown.
5. **Given** the campaign has already ended, **When** the backer attempts to pledge or unpledge, **Then** the action is disabled with a reason explaining the campaign has ended.

---

### User Story 3 - Creator lifecycle and refunds (Priority: P3)

A creator launches a campaign by providing a title, description, funding goal, start time, and end time; they can cancel before it starts, and claim the raised funds after it ends successfully. If a campaign fails to reach its goal, backers claim refunds of their contributions after it ends.

**Why this priority**: This completes the funding loop for both sides (creator payout and backer protection). The platform works for creators and backers only when these outcomes are reachable, but a read-only browsing app (Story 1) plus pledging (Story 2) still delivers demonstrated value.

Independent Test: Launch a campaign with a valid form, cancel a second one before its start, let a third reach its goal and claim as its creator, and let a fourth fall short and refund as one of its backers — each verified independently.

**Acceptance Scenarios**:

1. **Given** a connected wallet, **When** the creator submits a launch form with a valid title, description, goal, start time, and end time, **Then** the new campaign appears in the listings with an upcoming status.
2. **Given** an invalid submission (missing title or description, start time in the past, end time before start time, duration longer than the maximum allowed, or a zero goal), **When** the creator submits the form, **Then** the form rejects the submission with a message naming the specific rule violated, and no campaign is created.
3. **Given** a campaign that has not yet started, **When** its creator cancels it, **Then** it becomes marked as cancelled, cannot be funded, and other users are not misled into contributing.
4. **Given** an ended campaign whose pledged total is at least its goal, **When** its creator claims, **Then** the full pledged amount is released to the creator, the campaign is marked as claimed, and claiming again is blocked with an explanation.
5. **Given** an ended campaign whose pledged total is below its goal, **When** a backer with an outstanding contribution requests a refund, **Then** their contribution is returned to them, and the campaign is displayed as failed with refunds available.
6. **Given** a user with no contribution requests a refund, **When** they attempt it, **Then** they are told there is nothing to refund and no state changes.

---

### User Story 4 - Retro interface identity and action feedback (Priority: P4)

Every screen and interaction is presented in the retro workstation style of the provided reference image: a teal desktop, silver beveled chrome with navy title bars and window controls, retro buttons, inputs, checkboxes and dialogs, an 8/16-color palette, pixel-tight display and console typography, dashed multicolor accents, and a terminal-style panel (dark background, green text) that logs the outcome of every action in plain language. Where retro fidelity and accessibility pull in opposite directions, fidelity is kept while baseline accessibility (keyboard operation, visible focus, contrast, resizable text) is guaranteed.

**Why this priority**: The reference image is the explicitly stated design authority for this build, so this story governs how all other stories look and feel. It is ranked last only because it is cross-cutting polish on top of functional journeys — each functional story remains demonstrable on its own — but it is required before the feature is considered done.

**Independent Test**: Inspect each screen against the reference image's elements (window chrome, palette, typography, terminal panel) and verify that pending, success, and failure messages appear in the terminal-style log for every submitted action; complete one full flow using only the keyboard.

**Acceptance Scenarios**:

1. **Given** any screen of the app, **When** it is inspected against the reference image, **Then** window chrome, buttons, inputs, checkboxes, and dialogs use the beveled silver/navy treatment, the teal desktop background, the limited palette, and pixel-style typography — with no unstyled platform-default controls visible.
2. **Given** a submitted action, **When** it is pending, confirmed, or rejected, **Then** a human-readable message appears in the terminal-style status panel, and previous messages remain scrollably visible.
3. **Given** an interactive control, **When** it is hovered, focused, or pressed, **Then** it shows a clear visual state change consistent with the reference (pressed controls invert their bevel).
4. **Given** the app is viewed on a narrow laptop screen or a wide desktop monitor, **Then** layout, text, and controls remain legible and usable without overlapping or clipped content.
5. **Given** a keyboard-only user, **When** they navigate any screen, **Then** every action is reachable in a logical order, focus is clearly visible at all times, and text remains legible when enlarged.

---

### Edge Cases

- A campaign record that was cancelled (removed) while its identifier is still referenced externally — the UI must not render a broken or fundable entry for it.
- The campaign ends (or starts) while a transaction is in flight — the action fails with a clear "campaign has ended/has not started" message rather than an unexplained error.
- Goal reached before the campaign ends — pledging and unpledging remain possible until the end; claiming is still unavailable until after the end.
- Pledges exceeding the goal — progress may show more than 100%; the display must handle this gracefully.
- Amount entry of zero, negative, non-numeric, or absurdly large values — rejected or formatted safely with no layout overflow.
- Wallet has insufficient balance or insufficient spending permission, or the user rejects the wallet prompt — no state change, with a specific message.
- The connected network does not host the crowdfunding platform — the user is told clearly how to proceed instead of seeing silent failures.
- Duplicate claims or refunds, or a refund with zero outstanding contribution — blocked and explained.
- Slow or failed data loading — a retro-styled loading indicator and a retry affordance are shown instead of a blank screen.
- Campaign numbering contains gaps (due to cancellations) — listings and detail views handle missing identifiers gracefully.
- Two actions submitted in quick succession — the UI prevents double-submission while one is pending.
- The catalogue grows to hundreds of campaigns — status tabs, title search, and paged loading keep the list responsive; a search or filter with no matches shows a clear empty-result state.
- No injected wallet is installed in the browser — the visitor can still browse, and connect attempts show clear guidance instead of failing silently.

## Requirements *(mandatory)*

### Functional Requirements

**Discovery & display**

- **FR-001**: The system MUST list all campaigns ordered newest-first, showing title, goal, pledged total, progress percentage, start/end schedule, and status, with status filter tabs (All / Upcoming / Live / Successful / Failed), a title search box, and on-demand "Load more" paging for large lists.
- **FR-002**: The system MUST provide a campaign detail view including title, description, creator identity, time remaining or time until start, the viewer's own outstanding contribution when a wallet is connected, and claim/refund eligibility.
- **FR-003**: The system MUST classify every campaign with a plain-language status drawn from: upcoming, live, successful (ended with goal met), failed (ended without goal met), and cancelled, plus completion markers for claimed and refunded outcomes.
- **FR-004**: The system MUST display token amounts with correct decimal formatting and large numbers in a readable form, and shorten wallet addresses while keeping the full value retrievable on demand.

**Wallet & participation**

- **FR-005**: The system MUST let visitors browse without a wallet, connect and disconnect an injected browser wallet (the only connection method supported in v1), and always display the current connection state (account and network); every state-changing action MUST prompt connection first when no wallet is connected.
- **FR-006**: The system MUST validate campaign launch submissions against the platform's rules — non-empty title and description, positive goal, start time not in the past, end time no earlier than start time, and duration no longer than the allowed maximum — and report the specific violated rule.
- **FR-007**: The system MUST allow cancellation only by the campaign's own creator and only before the campaign starts.
- **FR-008**: The system MUST accept a pledge amount during a campaign's active window, validate it against the viewer's available balance and spending permission, show a pending state until the action settles, and update all displayed totals only after confirmation.
- **FR-009**: The system MUST allow a backer to withdraw all or part of their outstanding contribution at any time before the campaign ends, never exceeding their own contribution.
- **FR-010**: The system MUST enable claiming for the creator only after the campaign ends, only when the goal was met, and only once, disabling it otherwise with the reason shown.
- **FR-011**: The system MUST enable refunds only after a campaign ends without meeting its goal, showing the viewer's refundable amount, and disabling it otherwise with the reason shown.
- **FR-012**: The system MUST make unavailable actions visibly disabled with a plain-language explanation rather than failing silently after the attempt.

**Feedback & robustness**

- **FR-013**: The system MUST show loading, pending, success, and failure feedback for every user action, translating on-chain rejections into plain-language explanations.
- **FR-014**: The system MUST handle empty, loading, and failed data states explicitly, offering a retry when data cannot be loaded.
- **FR-015**: The system MUST detect when the connected network does not host the platform and guide the user instead of allowing silent failures; the default live target is a public testnet, with a local development chain used while building.
- **FR-016**: The system MUST prevent duplicate submissions while an action is pending.

**Retro interface (design authority: the provided reference image)**

- **FR-017**: The interface MUST apply the reference design system on every screen: teal desktop background; silver beveled windows with navy title bars and window controls; retro-styled buttons, text inputs, checkboxes, and dialogs; the reference's limited (8/16-color) palette; pixel-style display and console typography; and dashed multicolor accent elements.
- **FR-018**: The system MUST present action status messages in a terminal-style panel (dark background, light/green text) that accumulates a scrollable history of plain-language outcomes.
- **FR-019**: All interactive controls MUST show clear hover, focus, and pressed states consistent with the reference (pressed controls invert their bevel).
- **FR-020**: The layout MUST be desktop-first while remaining legible and fully usable on narrow laptop screens through wide desktop monitors, with no overlapping or clipped content.
- **FR-021**: Where retro fidelity and accessibility conflict, the interface MUST keep full retro fidelity while guaranteeing baseline accessibility: every action operable by keyboard alone, clearly visible focus states, WCAG-AA text contrast wherever the palette allows, and text resizable without clipped content.

### Key Entities

- **Campaign**: A funding project — its title and description (stored on-chain alongside its financial data), creator, funding goal, pledged total, start and end times, claimed flag, and existence (cancelled campaigns are removed). Status and progress are derived from these attributes and the current time.
- **Contribution (Pledge)**: A backer's stake in a campaign — the campaign it belongs to, the backer, amounts pledged and withdrawn over time, and the current outstanding amount, which becomes refundable if the campaign fails.
- **Wallet Session**: The currently connected account and network, together with the token balance and spending permission relevant to validating participation actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Within 5 seconds of landing, a first-time visitor can correctly identify a live campaign's goal, current progress, and end time (verified with at least 9 of 10 test users).
- **SC-002**: At least 90% of first-time backers complete the connect-and-fund flow without assistance, in under 2 minutes each.
- **SC-003**: A creator can launch a valid campaign in under 3 minutes, and 100% of invalid submissions are rejected with a message naming the specific rule violated.
- **SC-004**: 100% of blocked actions (inactive time window, wrong creator, insufficient funds, already claimed, already refunded) result in a plain-language explanation — never an unexplained failure.
- **SC-005**: In a design review against the reference image, at least 90% of inspected UI elements conform to the reference design system, and zero screens display unstyled platform-default controls.
- **SC-006**: A usable campaign list appears within 3 seconds on a typical home broadband connection, with a retry affordance whenever loading fails; applying a filter, search, or "Load more" keeps the list interactive with no perceptible freeze.
- **SC-007**: After every confirmed action, displayed totals (campaign pledged amount, personal contribution, refunds) match the underlying recorded values exactly — zero data inconsistencies across end-to-end acceptance runs of browse, fund, launch, cancel, claim, and refund flows.
- **SC-008**: 100% of primary actions are completable using the keyboard alone with visible focus at all times, and body text stays legible when enlarged — verified in an accessibility pass across every screen.

## Assumptions

- **Scope**: This feature primarily covers the user-facing interface and frontend; the existing crowdfunding contract receives a minimal extension to store each campaign's title and description on-chain (Clarification Q1), and testing that contract change is in scope. All other existing contract behavior remains a fixed dependency.
- The platform operates on a single fungible pledge token across all campaigns; amounts are shown in that token's units.
- Campaign and contribution data come directly from the crowdfunding contract's records and events; no separate backend, database, or off-chain service is required for v1 — campaign text lives on-chain with the financial data.
- Users connect through an injected browser wallet — the only connection method in v1 (Clarification Q2); remote wallet pairing (QR/mobile linking) and embedded email/social sign-in wallets are out of scope.
- v1 targets a public testnet as its live network, with a local development chain used while building (Clarification Q4); the app detects and reports network mismatches (FR-015).
- The reference image is the visual authority: teal desktop, navy title bars, silver bevels, 8/16-color palette, pixel display font plus console font (the reference names VT323, Pixelify Sans, and Silkscreen — equivalent pixel-style fonts may be substituted where identical assets are unavailable), dashed multicolor accents, and a green-on-black terminal panel. Where the reference is silent, styling choices remain consistent with its language; where retro fidelity and accessibility conflict, fidelity wins while baseline accessibility (keyboard, focus, contrast, resizable text) is still guaranteed (Clarification Q5, FR-021).
- Desktop-first design; narrow screens must remain usable (FR-020) but a dedicated mobile app, tablet-specific layouts, and offline support are out of scope.
- English is the only language for v1; localization, analytics, marketing pages, email/push notifications, and an admin dashboard are out of scope.
- Users have normal home-connection reliability; the app must degrade gracefully (loading/retry states) rather than assume perfect connectivity.
- Token balances, prices, and funding amounts are displayed as-is with no fiat conversion in v1.
