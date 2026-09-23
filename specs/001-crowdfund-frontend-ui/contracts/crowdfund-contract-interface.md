# On-Chain Interface Contract (frontend ↔ CrowdFund)

**Feature**: `001-crowdfund-frontend-ui` | Formal Solidity shape: [ICrowdFund.sol](./ICrowdFund.sol)

The complete API surface the frontend is allowed to consume. Anything not listed here is out of scope for the UI.

## Read operations

| # | Read | Returns | Used for |
|---|------|---------|----------|
| R1 | `count()` | total campaigns ever launched (ids 1..count, gaps possible) | list paging ("Load more", newest-first) |
| R2 | `campaigns(id)` | full struct incl. `title`, `description` | cards, detail view, status/progress derivation |
| R3 | `pledgedAmount(id, account)` | viewer's outstanding contribution | personal stake display, refund eligibility |
| R4 | `token()` | pledge token address | token symbol/decimals, balance & allowance reads |

Batching rule: page loads fetch `count()` + a range of `campaigns(id)` in batched calls; viewer extras (`pledgedAmount`, balance, allowance) fetch only when a wallet is connected (SC-006: list must render without a wallet).

## Write operations & preconditions

| # | Write | Preconditions (contract-enforced) | UI pre-flight mirror |
|---|-------|----------------------------------|----------------------|
| W1 | `launch(goal, startAt, endAt, title, description)` | `startAt ≥ now`, `endAt ≥ startAt`, `endAt ≤ now+90d`, `goal > 0`, title/description non-empty & within caps | all validated in-form with the specific rule named (FR-006, SC-003) |
| W2 | `cancel(id)` | caller == creator, `now < startAt` | cancel button only rendered for creator on upcoming campaigns (FR-007) |
| W3 | `pledge(id, amount)` | `startAt ≤ now ≤ endAt`; ERC-20 `transferFrom` succeeds (balance + allowance) | amount > 0, ≤ balance, allowance check/approval flow (FR-008) |
| W4 | `unpledge(id, amount)` | `now ≤ endAt`, `amount ≤ pledgedAmount[id][caller]` | amount ≤ outstanding, button disabled after end (FR-009) |
| W5 | `claim(id)` | caller == creator, `now > endAt`, `pledged ≥ goal`, `!claimed` | disabled-with-reason matrix (FR-010) |
| W6 | `refund(id)` | `now > endAt`, `pledged < goal`; caller's outstanding > 0 effectively | disabled-with-reason matrix, refundable amount shown (FR-011) |

**Write lifecycle (all writes)**: idle → pre-flight validation → wallet prompt → pending (terminal `info`) → confirmed (terminal `success`, totals refetched) | rejected/reverted (terminal `error`, plain language). Double-submits blocked while pending (FR-016).

## Events consumed

| Event | UI usage |
|-------|----------|
| `Launch(id, creator, goal, startAt, endAt, title, description)` | refresh count/list; terminal message "Campaign '<title>' launched" |
| `Cancel(id)` | mark/remove card; terminal message |
| `Pledge(id, caller, amount)` | refetch totals + personal stake; terminal success message |
| `Unpledge(id, caller, amount)` | same refresh path as Pledge, decreasing |
| `Claim(id)` | set claimed marker; terminal success message |
| `Refund(id, caller, amount)` | personal stake → 0; terminal success message |

## Revert → plain-language message map (`lib/errors.ts`, FR-013 / SC-004)

Every possible rejection must surface a human sentence — never a raw revert string.

| Revert text (contract / ERC-20) | User-facing message |
|--------------------------------|---------------------|
| `start at < now` | "Start time can't be in the past." |
| `end at < start at` | "End time must be after the start time." |
| `end at > max duration` | "Campaigns can run at most 90 days." |
| `goal = 0` | "Funding goal must be greater than zero." |
| `title empty` (new) | "Give your campaign a title." |
| `description empty` (new) | "Add a description so backers know what they're funding." |
| `title too long` (new) | "Title must be 80 characters or fewer." |
| `description too long` (new) | "Description must be 500 characters or fewer." |
| `not creator` | "Only the campaign creator can do that." |
| `already started` | "This campaign already started — it can't be cancelled." |
| `not started` | "This campaign hasn't started yet." |
| `ended` | "This campaign has ended." |
| `insufficient pledge` | "You can't withdraw more than you've pledged." |
| `not ended yet` | "This campaign hasn't ended yet." |
| `pledged < goal` | "The goal wasn't reached — claim a refund instead." |
| `pledged >= goal` | "The goal was reached — refunds aren't available." |
| `claimed` | "These funds have already been claimed." |
| `transfer failed` | "The token transfer failed — check your balance and approval." |
| ERC-20 insufficient allowance | "Approve the pledge token for this amount first." |
| ERC-20 insufficient balance | "You don't have enough pledge tokens." |
| user rejected signature | "You rejected the request in your wallet — nothing was sent." |
| wrong chain | "Your wallet is on the wrong network — switch to continue." |
| unknown | "Something went wrong — the action didn't complete." (safe fallback; full detail in terminal log) |

## Out of scope for the UI

Any contract function/event not listed above · fiat pricing · indexer/subgraph reads · multi-network selector (single configured live network + local dev per Clarification Q4).
