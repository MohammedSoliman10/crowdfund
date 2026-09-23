// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * Interface contract for the extended CrowdFund platform consumed by the
 * frontend (Phase 1 artifact — specification, not yet implemented source).
 *
 * Diff vs existing contracts/src/CrowdFund.sol (Clarification Q1):
 *   - Campaign gains `title` and `description` fields
 *   - launch() gains title/description parameters with length validation
 *   - Launch event carries title/description
 * Everything else (rules, events, behavior) is unchanged and fixed.
 */
interface ICrowdFund {
    struct Campaign {
        address creator;      // address(0) => cancelled/removed
        uint256 goal;         // token amount, > 0
        uint256 pledged;      // running total of outstanding contributions
        uint32 startAt;       // >= creation time
        uint32 endAt;         // >= startAt, <= creation time + 90 days
        bool claimed;         // creator has collected a successful campaign
        string title;         // NEW: non-empty, <= 80 bytes
        string description;   // NEW: non-empty, <= 500 bytes
    }

    // ---- reads used by the UI ----
    function token() external view returns (address);
    function count() external view returns (uint256);
    function campaigns(uint256 id) external view returns (Campaign memory);
    function pledgedAmount(uint256 id, address backer) external view returns (uint256);

    // ---- writes triggered by the UI ----
    function launch(
        uint256 goal,
        uint32 startAt,
        uint32 endAt,
        string calldata title,
        string calldata description
    ) external;

    function cancel(uint256 id) external;
    function pledge(uint256 id, uint256 amount) external;
    function unpledge(uint256 id, uint256 amount) external;
    function claim(uint256 id) external;
    function refund(uint256 id) external;

    // ---- events consumed for refresh + terminal narration ----
    event Launch(
        uint256 id,
        address indexed creator,
        uint256 goal,
        uint32 startAt,
        uint32 endAt,
        string title,
        string description
    );
    event Cancel(uint256 id);
    event Pledge(uint256 indexed id, address indexed caller, uint256 amount);
    event Unpledge(uint256 indexed id, address indexed caller, uint256 amount);
    event Claim(uint256 id);
    event Refund(uint256 id, address indexed caller, uint256 amount);
}
