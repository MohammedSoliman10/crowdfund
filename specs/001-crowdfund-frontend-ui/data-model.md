# Data Model: Crowdfund Frontend UI (Phase 1)

**Feature**: `001-crowdfund-frontend-ui` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

Source of truth is the `CrowdFund` contract (plus the title/description extension from Clarification Q1). The frontend derives everything else with pure functions. No backend entities exist.

---

## Entities

### 1. Campaign (on-chain struct)

| Field | Shape | Rules / Notes |
|-------|-------|---------------|
| `id` | sequential integer, 1-based | Gaps possible — cancelled campaigns are deleted but ids are not reused (FR-001 edge case) |
| `title` | text, non-empty, ≤ 80 bytes | **New (Q1)** — validated at launch (FR-006) |
| `description` | text, non-empty, ≤ 500 bytes | **New (Q1)** — validated at launch (FR-006) |
| `creator` | account address | `address(0)` ⇒ record was cancelled/removed; UI must not render as fundable |
| `goal` | token amount, > 0 | Set at launch, immutable |
| `pledged` | token amount ≥ 0 | Running total of all outstanding contributions |
| `startAt` | timestamp | Must be ≥ creation time (FR-006) |
| `endAt` | timestamp | ≥ `startAt`; ≤ creation time + 90 days (FR-006) |
| `claimed` | flag | Creator has collected funds (only possible on success) |

**Derived (client-side, never stored):**

- `status` ∈ {`upcoming`, `live`, `successful`, `failed`} + `cancelled` overlay (see state machine) + `claimed` completion marker (FR-003)
- `progressPct` = `pledged / goal × 100` — may exceed 100 (over-funding edge case)
- `timeRemaining` / `timeUntilStart` relative to current time
- `exists` = `creator ≠ address(0)`

### 2. Contribution (Pledge)

Key: `(campaignId, backerAccount)` — maps to on-chain `pledgedAmount`.

| Field | Shape | Rules / Notes |
|-------|-------|---------------|
| `outstanding` | token amount ≥ 0 | Current stake after any un-pledges (on-chain) |
| `lifetimePledged` | token amount | Derived from `Pledge` event history (display only) |
| `withdrawn` | token amount | `lifetimePledged − outstanding` (display only) |

**States** (per contribution):

```
none ──pledge──▶ active ──unpledge(≤outstanding)──▶ active (reduced) ──▶ 0 (fully withdrawn)
                  │
                  ├─ campaign ends & goal met ─────▶ settled (kept by creator; no action)
                  └─ campaign ends & goal missed ──▶ refundable ──refund──▶ refunded (outstanding→0)
```

### 3. Wallet Session

| Field | Shape | Notes |
|-------|-------|-------|
| `address` | account or null | Connected account (shortened in UI, full retrievable — FR-004) |
| `chainId` | integer or null | Used for FR-015 mismatch detection |
| `connection` | `disconnected \| connecting \| connected \| no-wallet` | `no-wallet` = no injected wallet installed (guidance shown, browsing still works) |
| `network` | `correct \| wrong` | `wrong` ⇒ actions blocked with switch guidance (FR-015) |
| `tokenBalance` | token amount | For pledge pre-flight validation (FR-008) |
| `allowance` | token amount | Spending permission for the CrowdFund contract; insufficient ⇒ prompt approval before/with pledge |

### 4. Terminal Message (UI-only, in-memory session log)

| Field | Shape | Notes |
|-------|-------|-------|
| `id` | unique integer | Monotonic |
| `timestamp` | time | Display only |
| `severity` | `info \| success \| error` | Drives terminal styling |
| `text` | plain-language sentence | Always translated — never a raw revert string (FR-013, SC-004) |

### 5. Campaign View State (UI-only)

| Field | Shape | Notes |
|-------|-------|-------|
| `statusTab` | `all \| upcoming \| live \| successful \| failed` | FR-001 tabs (cancelled campaigns don't get a tab; excluded or shown under `all`) |
| `search` | text | Case-insensitive substring match on `title` (FR-001) |
| `visibleCount` | integer | "Load more" page size accumulator; newest-first ordering (FR-001) |
| `dataState` | `loading \| ready \| error` | `error` ⇒ retry affordance (FR-014) |

---

## Campaign State Machine (FR-003, single source: `deriveStatus()`)

```
                    launch
                      │
                      ▼
                 ┌──────────┐  now ≥ startAt   ┌──────┐
                 │ upcoming │ ────────────────▶ │ live │
                 └──────────┘                   └──────┘
                      │                          │      │
   cancel (creator,   │                 now>endAt│      │now>endAt
   only before start) │                          ▼      ▼
                      ▼                   ┌───────────┐ ┌────────┐
                 ┌───────────┐            │successful │ │ failed │
                 │ cancelled │            │(goal met) │ │(short) │
                 │ (deleted) │            └───────────┘ └────────┘
                 └───────────┘                 │             │
                            creator claims ◀──┘             └──▶ backers refund
                            (once)                                (each, once)
                              │                                     │
                              ▼                                     ▼
                        [claimed]                            [refunded]
```

Transition guards (must match contract exactly — SC-007):

| Transition | Guard |
|------------|-------|
| launch → upcoming | form valid (title, description, goal > 0, start ≥ now, end ≥ start, end ≤ now + 90d) |
| upcoming → cancelled | caller == creator AND now < startAt |
| upcoming → live | now ≥ startAt |
| live → successful | now > endAt AND pledged ≥ goal |
| live → failed | now > endAt AND pledged < goal |
| successful → claimed | caller == creator AND now > endAt AND pledged ≥ goal AND !claimed |
| failed → refunded | now > endAt AND pledged < goal AND caller's outstanding > 0 |

## Action Eligibility Matrix (FR-007 … FR-012 — drives disabled-with-reason states)

| Action | Enabled when | Otherwise shown disabled with reason |
|--------|--------------|--------------------------------------|
| Launch | Connected, network correct, form valid | "Connect your wallet" / "Wrong network" / named rule violated |
| Cancel | caller == creator AND status == upcoming | "Only the creator can cancel" / "Already started" |
| Pledge | status == live AND amount > 0 AND ≤ balance AND network correct | Not started / Ended / "Not enough tokens" / "Approve spending first" |
| Unpledge | now ≤ endAt AND 0 < amount ≤ outstanding | "Nothing to withdraw" / "Exceeds your pledge" / "Ended" |
| Claim | caller == creator AND status == successful AND !claimed | "Goal not met" / "Not ended yet" / "Already claimed" / "Not the creator" |
| Refund | status == failed AND outstanding > 0 | "Goal was met — no refunds" / "Not ended yet" / "Nothing to refund" |

## Relationships & Validation Summary

```
WalletSession 1 ─── * Contribution * ─── 1 Campaign
WalletSession 1 ─── * Campaign (as creator)
Campaign 1 ─── * TerminalMessage (session log entries reference it textually)
CampaignListView { statusTab, search, visibleCount } ──filters──▶ [Campaign] (derived list)
```

**Client-side validation (mirrors contract — `lib/validate.ts`)**: title non-empty/≤80 bytes · description non-empty/≤500 bytes · goal > 0 · start not in past · end ≥ start · end ≤ now+90d · pledge amount > 0, ≤ balance, allowance covered · unpledge ≤ outstanding. Contract remains authoritative; pre-flight exists for instant, specific messages (SC-003, SC-004).
