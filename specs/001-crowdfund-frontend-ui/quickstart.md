# Quickstart & Validation Guide: Crowdfund Frontend UI

**Feature**: `001-crowdfund-frontend-ui` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Run guide for proving the feature works end-to-end. No implementation bodies live here — commands, scenarios, expected outcomes only.

## Prerequisites

- Foundry (`forge`, `anvil`, `cast`) — installed: v1.7.1
- Node.js ≥ 20 + npm — installed: v24.20.0
- A browser wallet extension (injected, e.g. MetaMask-style) — Clarification Q2

## 1. Setup & automated checks

```bash
# Contracts: build + run the test suite (existing behavior + title/description extension)
cd contracts
forge test

# Frontend: install, unit tests, production build
cd ../frontend
npm install
npm run test:unit        # Vitest + RTL: status derivation, error map, validation, primitives
npm run build            # must succeed with zero type errors
```

**Expected**: `forge test` green (incl. new title/description length & rule tests) · unit tests green · build succeeds.

## 2. Local end-to-end run

```bash
# Terminal 1 — local chain (chain id 31337)
anvil

# Terminal 2 — deploy MockToken + CrowdFund; prints addresses
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key <anvil-account-0-key>
# → write printed addresses into frontend/src/config/contracts.ts (chain 31337)

# Seed a backer account with pledge tokens (deployer is MockToken owner)
cast send <TOKEN_ADDRESS> "mint(address,uint256)" <backer-address> 1000000000000000000000 \
  --rpc-url http://127.0.0.1:8545 --private-key <anvil-account-0-key>

# Terminal 2 — frontend
cd frontend
npm run dev               # open http://localhost:5173
```

**Wallet setup**: import an Anvil dev account into your wallet extension, add the local network (rpc `http://127.0.0.1:8545`, chain id `31337`), ensure the pledge token is added as a custom token.

## 3. Manual validation scenarios

| # | Scenario | Steps | Expected outcome | Covers |
|---|----------|-------|------------------|--------|
| 1 | Browse without wallet | Open app, wallet disconnected | Retro desktop with campaign windows: title, goal, pledged, progress, schedule, status visible; newest-first | Story 1, FR-001, SC-001 |
| 2 | Filter & search | Click status tabs; type a title fragment; clear it | List narrows instantly, no freeze; no-match shows empty-result message; "Load more" appends older campaigns | FR-001, SC-006 |
| 3 | Campaign detail | Open a campaign window | Description, creator (shortened, full on demand), timing, claim/refund eligibility shown | FR-002 |
| 4 | Launch — invalid | Submit form with past start / end<start / >90d / zero goal / empty title | Form rejects each with the specific rule named; no campaign created | FR-006, SC-003 |
| 5 | Launch — valid | Fill valid title, description, goal, schedule; submit; approve in wallet | Pending terminal message → success; new campaign appears as **Upcoming** | Story 3, FR-013 |
| 6 | Pledge, no wallet | Click fund action while disconnected | Connect prompt first; no wallet popup fired | FR-005 |
| 7 | Pledge success | Connect funded wallet, approve token if prompted, pledge during live window | Pending → success in terminal; campaign total, progress, and personal stake increase after confirmation only | Story 2, FR-008, SC-002 |
| 8 | Pledge rejections | Amount > balance; before start; after end | Specific plain-language message each time; no funds move | FR-013, SC-004 |
| 9 | Unpledge | Withdraw part, then all, before end | Tokens returned; totals and personal stake decrease; over-withdraw blocked with reason | FR-009 |
| 10 | Cancel | Creator cancels an Upcoming campaign (non-creator cannot) | Marked cancelled / excluded; unfundable; non-creator sees "Only the creator…" | FR-007 |
| 11 | Claim | Warp time past end on a goal-met campaign (`anvil_setNextBlockTimestamp`), creator claims | Funds released once; **Claimed** marker; second claim blocked with reason | FR-010 |
| 12 | Refund | Warp past end on a short campaign; backer refunds | Contribution returned; campaign **Failed**; refund with zero stake told "nothing to refund" | FR-011 |
| 13 | Wrong network | Connect wallet on a different chain | Actions blocked; switch-guidance message; browsing still works | FR-015 |
| 14 | No wallet installed | Use a browser profile without any wallet | Browsing fully works; connect attempt shows clear guidance | Edge case |
| 15 | Keyboard-only pass | Complete browse → fund → launch using only Tab/Enter/Space | All actions reachable, focus always visible, no keyboard trap | FR-021, SC-008 |
| 16 | Design review | Compare every screen to the reference image | Beveled chrome, navy title bars, teal desktop, palette, pixel fonts, terminal log — zero unstyled default controls | FR-017…020, SC-005 |
| 17 | Data integrity | After each confirmed action, compare on-screen totals vs `cast call` of `campaigns(id)` / `pledgedAmount` | Exact match, zero discrepancies | SC-007 |

## 4. End-to-end automation

```bash
cd frontend
npm run test:e2e      # Playwright: spins against local Anvil, drives injected-wallet stub,
                      # executes scenarios 1–15 incl. keyboard pass; asserts totals via viem
```

**Expected**: all e2e scenarios green; terminal log assertions confirm ≥1 plain-language message per attempted action.

## 5. Testnet deployment (live target — Clarification Q4)

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $DEPLOYER_KEY
# → write printed addresses into frontend/src/config/contracts.ts (chain 11155111)

cd ../frontend
npm run build        # static output; host on any static host
```

Then: switch wallet to Sepolia, repeat scenarios 1–17 against the deployed instance. FR-015 guidance must appear when the wallet is on any other chain.

## 6. Definition-of-done gate

All spec Success Criteria verifiable from this guide: SC-001/SC-002/SC-003 (timed manual runs), SC-004 (scenarios 4, 8, 10–13), SC-005 (scenario 16), SC-006 (scenario 2 timing), SC-007 (scenario 17), SC-008 (scenario 15).
