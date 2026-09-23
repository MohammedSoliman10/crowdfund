<!--
Sync Impact Report
Version change: 0.0.0 → 1.0.0
Modified principles: N/A (initial creation)
Added sections: All principles and governance
Removed sections: N/A
Follow-up TODOs: RATIFICATION_DATE needs to be set to actual adoption date
-->

# Project Constitution

## Core Principles

### Principle 1: Language and Tooling Standardization

**Solidity 0.8.28 with Foundry exclusively.** All smart contracts MUST target Solidity version 0.8.28 exactly. The Foundry toolkit (forge, cast, anvil, chisel) is the only permitted development, testing, and deployment toolchain. No other frameworks (Hardhat, Truffle, etc.) shall be introduced.

Rationale: Single-version pinning eliminates compiler-dependent behavior drift. Foundry's Rust-based execution provides deterministic, fast, and reproducible builds and tests.

### Principle 2: Checks-Effects-Interactions Pattern

**Every function that transfers tokens or Ether MUST follow the checks-effects-interactions pattern.** State updates (effects) MUST complete before any external call (interaction). Reentrancy guards are not a substitute for correct ordering.

Rationale: This is the primary defense against reentrancy attacks. External calls to untrusted contracts (including ERC20 `transfer`/`transferFrom`) can re-enter the calling contract; completing all state mutations first ensures the contract's internal accounting is consistent regardless of callee behavior.

### Principle 3: No Floating Pragmas

**All contracts MUST declare an exact Solidity version pragma.** The use of floating pragmas (`^`, `>=`, `<`, etc.) is prohibited. Every `pragma solidity` statement MUST be `pragma solidity 0.8.28;`.

Rationale: Floating pragmas allow silent compilation with different compiler versions, introducing undefined behavior risk. Pinning ensures reproducible bytecode and prevents accidental upgrades that could change semantics or introduce bugs.

### Principle 4: Comprehensive Test Coverage for State-Changing Functions

**Every state-changing (non-view/pure) function MUST have at minimum:**
- One Foundry test covering the happy path (successful execution with valid inputs)
- One Foundry test covering at least one revert/failure case (invalid input, access control, business logic violation)

Tests MUST be written in Solidity using Forge's test framework. Test names SHOULD follow the convention `test<FunctionName>_<Scenario>`.

Rationale: State-changing functions mutate storage and transfer value; they are the highest-risk surface. Mandating both success and failure paths ensures guard logic is exercised and regressions are caught.

### Principle 5: 100% Branch Coverage on Core Logic Before Testnet Deployment

**No contract MAY be deployed to any testnet or mainnet until core logic achieves 100% branch coverage.** Core logic includes all state-changing functions, access control checks, and token transfer pathways. Coverage is measured by `forge coverage --report lcov` (or equivalent). Deployment pipelines MUST gate on this metric.

Rationale: Branch coverage validates that every conditional path (require/revert branches, if/else, loop exits) has been exercised. Gating deployment prevents untested code paths from reaching user funds.

### Principle 6: Custom Errors Over Require Strings

**All new code MUST use custom errors instead of `require(..., "string")` error messages.** Existing `require` strings in legacy code SHOULD be migrated to custom errors when those functions are modified. Custom errors MUST be defined at the contract or interface level and follow the naming convention `ErrorName(parameters)`.

Rationale: Custom errors are cheaper (lower deployment and runtime gas), support structured parameters for off-chain decoding, and avoid string bloat in bytecode. They are the modern Solidity standard (since 0.8.4).

### Principle 7: Frontend Reads On-Chain State Directly

**Production frontend builds MUST read on-chain state directly via wagmi hooks (or equivalent type-safe RPC clients).** No cached, mocked, or simulated state is permitted in production. Local development may use anvil forks, but the production artifact must connect to a live RPC endpoint.

Rationale: Cached or mocked state introduces staleness and divergence risk. Direct on-chain reads guarantee users see the true contract state at all times, eliminating a class of UI/contract desynchronization bugs.

## Governance

### Amendment Procedure

Proposals to amend this constitution MUST:
1. Be submitted as a written proposal with rationale
2. Undergo a minimum 7-day review period
3. Receive approval from all core maintainers (or a defined quorum if the team scales)
4. Be merged via pull request with the updated constitution and an incremented `CONSTITUTION_VERSION`

### Versioning Policy

`CONSTITUTION_VERSION` follows Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Backward-incompatible principle removals or redefinitions that change compliance requirements
- **MINOR**: New principles added, or existing principles materially expanded
- **PATCH**: Clarifications, wording fixes, typo corrections, non-semantic refinements

The current version is **1.0.0**.

### Compliance Review

All pull requests modifying contract code MUST include a constitution compliance check in the PR description, confirming adherence to Principles 1–7. CI pipelines SHOULD automate verification where feasible (e.g., pragma version, coverage thresholds, custom error usage).

### Ratification and Amendment Dates

- **RATIFICATION_DATE**: TODO(RATIFICATION_DATE): Set to actual adoption date (YYYY-MM-DD)
- **LAST_AMENDED_DATE**: 2026-09-23

---

*This constitution governs the CrowdFund smart contract project. All contributors are bound by its principles.*
