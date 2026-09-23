# UI State Contracts (Phase 1)

**Feature**: `001-crowdfund-frontend-ui` | Bound to: [spec.md](../spec.md), [data-model.md](../data-model.md), [crowdfund-contract-interface.md](./crowdfund-contract-interface.md)

Interface contracts for the application's own surfaces: view-model shapes, state machines, and the design-token contract derived from the reference image.

---

## 1. Wallet state machine (FR-005, FR-015)

```
                    connect clicked
  disconnected ─────────────────────▶ connecting ──▶ connected (network correct)
       ▲                                 │                 │
       │            no window.ethereum   │                 │ chainId ∉ {31337, sepolia}
       │◀────────────────────────────────┘                 ▼
  no-wallet (browse-only, guidance shown)          connected (network wrong)
       │                                                │ user switches network
       └─────────────── disconnect ◀────────────────────┴────────────────◀──┘
```

Contract: `connected` is the **only** state where write actions may be initiated; `no-wallet` and `network wrong` keep all browsing fully functional (Story 1 works without any wallet).

## 2. View-model shapes

```ts
CampaignCardVM {
  id: number
  title: string                 // ≤ 80 chars
  descriptionSnippet: string    // first ~140 chars for the card
  goalLabel, pledgedLabel: string   // formatted token amounts (FR-004)
  progressPct: number           // may exceed 100 → displayed as "100%+" bar + exact label
  status: 'upcoming'|'live'|'successful'|'failed'|'cancelled'
  claimed: boolean
  timingLabel: string           // "Starts in 2d 4h" | "Ends in 5h 12m" | "Ended Mar 3"
}

CampaignDetailVM = CampaignCardVM & {
  description: string
  creatorAddress, creatorLabel: string
  myOutstanding?: string        // present only when wallet connected
  actions: ActionAvailability[] // from data-model eligibility matrix
}

TerminalMessageVM { id, timeLabel, severity: 'info'|'success'|'error', text }

ConnectButtonVM {
  state: 'disconnected'|'connecting'|'connected'|'no-wallet'
  accountLabel?: string         // shortened 0x1234…abcd, full retrievable (FR-004)
  networkLabel?: string
  networkOk: boolean
}
```

## 3. Component behavior contracts

| Component | Must honor |
|-----------|-----------|
| `CampaignListWindow` | newest-first; tabs All/Upcoming/Live/Successful/Failed; title search (case-insensitive); "Load more" adds next page; empty, empty-result, loading, error+retry states (FR-001, FR-014) |
| `Button` | variants `default|primary|danger`; states `enabled|hover|focus-visible|pressed|disabled`; disabled **always** paired with visible plain-language reason (FR-012); pressed inverts bevel (FR-019) |
| `Dialog` (launch/connect/confirm) | modal over the desktop; Esc + close control; focus moves in, returns out; validation errors name the specific violated rule (FR-006) |
| `Terminal` | append-only session log; severity styling; always scrollable to history; every write lifecycle posts ≥1 message (FR-018) |
| `ProgressBar` | bevel-in trough, blocky fill, label with exact amount + pct; handles >100% |
| All primitives | semantic element underneath (button/input/label/dialog) for keyboard order + screen readers (FR-021) |

## 4. Action-availability contract (single shared function)

One pure function `getActionAvailability(campaign, session, viewerContribution)` returns, for each action, `{ enabled: boolean, reason: string | null }`. Components **may not** re-implement the rules — this guarantees list/detail/tabs never disagree (SC-007). Reasons are the same plain-language sentences listed in [crowdfund-contract-interface.md](./crowdfund-contract-interface.md)'s revert map where applicable.

## 5. Design-token contract (FR-017 … FR-021, from the reference image)

| Token group | Values |
|-------------|--------|
| Palette (8/16-color VGA) | Teal `#008080` (desktop bg), Navy `#000080` (title bars, accents), Silver `#C0C0C0` (chrome), White `#FFFFFF` (bevel highlight/paper), Black `#000000` (shadow/terminal bg), Yellow `#FFFF00` (headline accent/alert), Green `#00FF00`/`#00FF80` (terminal text), Alert Red `#FF0000` (danger) |
| Bevel grammar | `bevel-out` = white top/left + dark-gray bottom/right; `bevel-in` = inverse; width 2px; radius 0; pressed/hover states invert |
| Typography | Display: Pixelify Sans / Silkscreen (headings, buttons); Console: VT323 (body copy, terminal); sizes in `rem` with root-scale resizable text |
| Window chrome | Silver body, navy title bar, white title text, 3D control buttons (□ min, □ max, ✕ close) |
| Terminal panel | Black background, green monospace text, block cursor accent |
| Accents | Dashed multicolor underline (navy/teal/silver/yellow segments) for section rules |
| Accessibility floor | Focus-visible = navy dashed outline on all controls; text/background pairs verified WCAG AA (navy-on-silver, black-on-teal, green-on-black, white-on-navy); no unstyled default controls anywhere (SC-005) |

## 6. Non-contracts (explicitly out)

No REST/GraphQL API · no auth beyond the wallet · no notifications/push · no fiat conversion · no mobile-specific layouts beyond "stays usable on narrow laptops" (FR-020).
