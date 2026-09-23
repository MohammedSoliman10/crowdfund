// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CrowdFund} from "../src/CrowdFund.sol";
import {MockToken} from "../src/mocks/MockToken.sol";

contract CrowdFundTest is Test {
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

    CrowdFund internal fund;
    MockToken internal token;

    address internal creator = makeAddr("creator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant GOAL = 1_000e18;
    uint32 internal startAt;
    uint32 internal endAt;

    function setUp() public {
        token = new MockToken("Crowd Fund Token", "CFT");
        fund = new CrowdFund(address(token));

        startAt = uint32(block.timestamp + 1 hours);
        endAt = uint32(block.timestamp + 1 days);

        token.mint(alice, 10_000e18);
        token.mint(bob, 10_000e18);

        vm.prank(alice);
        token.approve(address(fund), type(uint256).max);
        vm.prank(bob);
        token.approve(address(fund), type(uint256).max);
    }

    // ---------- helpers ----------

    function _launch() internal returns (uint256 id) {
        vm.prank(creator);
        fund.launch(GOAL, startAt, endAt, "Solar Bus Shelter", "Raise funds for 10 shelters.");
        id = fund.count();
    }

    function _launchAndStart() internal returns (uint256 id) {
        id = _launch();
        vm.warp(startAt);
    }

    function _creatorOf(uint256 id) internal view returns (address a) {
        (a,,,,,,,) = fund.campaigns(id);
    }

    function _goalOf(uint256 id) internal view returns (uint256 g) {
        (,g,,,,,,) = fund.campaigns(id);
    }

    function _pledgedOf(uint256 id) internal view returns (uint256 p) {
        (,,p,,,,,) = fund.campaigns(id);
    }

    function _claimedOf(uint256 id) internal view returns (bool c) {
        (,,,,,c,,) = fund.campaigns(id);
    }

    function _titleOf(uint256 id) internal view returns (string memory s) {
        (,,,,,,s,) = fund.campaigns(id);
    }

    function _descriptionOf(uint256 id) internal view returns (string memory s) {
        (,,,,,,,s) = fund.campaigns(id);
    }

    // ---------- launch ----------

    function test_Launch_StoresTitleAndDescription() public {
        uint256 id = _launch();
        assertEq(_creatorOf(id), creator);
        assertEq(_goalOf(id), GOAL);
        assertEq(_titleOf(id), "Solar Bus Shelter");
        assertEq(_descriptionOf(id), "Raise funds for 10 shelters.");
    }

    function test_Launch_EmitsLaunchEventWithText() public {
        vm.expectEmit(true, false, false, true);
        emit Launch(
            fund.count() + 1,
            creator,
            GOAL,
            startAt,
            endAt,
            "Solar Bus Shelter",
            "Raise funds for 10 shelters."
        );
        _launch();
    }

    function test_Launch_RevertWhen_StartInPast() public {
        vm.expectRevert("start at < now");
        vm.prank(creator);
        fund.launch(GOAL, uint32(block.timestamp - 1), endAt, "T", "D");
    }

    function test_Launch_RevertWhen_EndBeforeStart() public {
        vm.expectRevert("end at < start at");
        vm.prank(creator);
        fund.launch(GOAL, startAt, uint32(block.timestamp), "T", "D");
    }

    function test_Launch_RevertWhen_EndBeyondMaxDuration() public {
        vm.expectRevert("end at > max duration");
        vm.prank(creator);
        fund.launch(GOAL, startAt, uint32(block.timestamp + 91 days), "T", "D");
    }

    function test_Launch_RevertWhen_GoalZero() public {
        vm.expectRevert("goal = 0");
        vm.prank(creator);
        fund.launch(0, startAt, endAt, "T", "D");
    }

    function test_Launch_RevertWhen_TitleEmpty() public {
        vm.expectRevert("title empty");
        vm.prank(creator);
        fund.launch(GOAL, startAt, endAt, "", "D");
    }

    function test_Launch_RevertWhen_TitleTooLong() public {
        vm.expectRevert("title too long");
        vm.prank(creator);
        fund.launch(GOAL, startAt, endAt, new string(81), "D");
    }

    function test_Launch_RevertWhen_DescriptionEmpty() public {
        vm.expectRevert("description empty");
        vm.prank(creator);
        fund.launch(GOAL, startAt, endAt, "T", "");
    }

    function test_Launch_RevertWhen_DescriptionTooLong() public {
        vm.expectRevert("description too long");
        vm.prank(creator);
        fund.launch(GOAL, startAt, endAt, "T", new string(501));
    }

    function test_Launch_AcceptsMaxTitleAndDescriptionLengths() public {
        vm.prank(creator);
        fund.launch(GOAL, startAt, endAt, new string(80), new string(500));
        assertEq(fund.count(), 1);
    }

    // ---------- cancel ----------

    function test_Cancel_RevertWhen_NotCreator() public {
        uint256 id = _launch();
        vm.expectRevert("not creator");
        vm.prank(alice);
        fund.cancel(id);
    }

    function test_Cancel_RevertWhen_AlreadyStarted() public {
        uint256 id = _launch();
        vm.warp(startAt);
        vm.expectRevert("already started");
        vm.prank(creator);
        fund.cancel(id);
    }

    function test_Cancel_RemovesCampaignBeforeStart() public {
        uint256 id = _launch();
        vm.prank(creator);
        fund.cancel(id);
        assertEq(_creatorOf(id), address(0));
    }

    // ---------- pledge ----------

    function test_Pledge_RevertWhen_NotStarted() public {
        uint256 id = _launch();
        vm.expectRevert("not started");
        vm.prank(alice);
        fund.pledge(id, 100e18);
    }

    function test_Pledge_RevertWhen_Ended() public {
        uint256 id = _launch();
        vm.warp(uint256(endAt) + 1);
        vm.expectRevert("ended");
        vm.prank(alice);
        fund.pledge(id, 100e18);
    }

    function test_Pledge_UpdatesTotalsAndTransfers() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, 300e18);

        assertEq(_pledgedOf(id), 300e18);
        assertEq(fund.pledgedAmount(id, alice), 300e18);
        assertEq(token.balanceOf(address(fund)), 300e18);
    }

    function test_Pledge_RevertWhen_InsufficientAllowance() public {
        uint256 id = _launchAndStart();
        vm.prank(bob);
        token.approve(address(fund), 0);
        vm.expectRevert();
        vm.prank(bob);
        fund.pledge(id, 10e18);
    }

    function test_Pledge_RevertWhen_InsufficientBalance() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        token.transfer(bob, 10_000e18);
        vm.expectRevert();
        vm.prank(alice);
        fund.pledge(id, 10e18);
    }

    // ---------- unpledge ----------

    function test_Unpledge_RevertWhen_MoreThanPledged() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, 100e18);
        vm.expectRevert("insufficient pledge");
        vm.prank(alice);
        fund.unpledge(id, 101e18);
    }

    function test_Unpledge_RevertWhen_Ended() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, 100e18);
        vm.warp(uint256(endAt) + 1);
        vm.expectRevert("ended");
        vm.prank(alice);
        fund.unpledge(id, 50e18);
    }

    function test_Unpledge_PartialAndFullReturnsTokens() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, 100e18);

        vm.prank(alice);
        fund.unpledge(id, 40e18);
        assertEq(fund.pledgedAmount(id, alice), 60e18);
        assertEq(token.balanceOf(alice), 9_940e18);

        vm.prank(alice);
        fund.unpledge(id, 60e18);
        assertEq(fund.pledgedAmount(id, alice), 0);
        assertEq(token.balanceOf(alice), 10_000e18);
    }

    // ---------- claim ----------

    function test_Claim_RevertWhen_NotCreator() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, GOAL);
        vm.warp(uint256(endAt) + 1);
        vm.expectRevert("not creator");
        vm.prank(alice);
        fund.claim(id);
    }

    function test_Claim_RevertWhen_NotEnded() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, GOAL);
        vm.expectRevert("not ended");
        vm.prank(creator);
        fund.claim(id);
    }

    function test_Claim_RevertWhen_GoalNotMet() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, GOAL - 1);
        vm.warp(uint256(endAt) + 1);
        vm.expectRevert("pledged < goal");
        vm.prank(creator);
        fund.claim(id);
    }

    function test_Claim_RevertWhen_AlreadyClaimed() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, GOAL);
        vm.warp(uint256(endAt) + 1);
        vm.prank(creator);
        fund.claim(id);
        vm.expectRevert("claimed");
        vm.prank(creator);
        fund.claim(id);
    }

    function test_Claim_TransfersPledgedToCreator() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, GOAL);
        vm.warp(uint256(endAt) + 1);

        vm.prank(creator);
        fund.claim(id);

        assertEq(token.balanceOf(creator), GOAL);
        assertTrue(_claimedOf(id));
    }

    // ---------- refund ----------

    function test_Refund_RevertWhen_NotEnded() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, 100e18);
        vm.expectRevert("not ended");
        vm.prank(alice);
        fund.refund(id);
    }

    function test_Refund_RevertWhen_GoalMet() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, GOAL);
        vm.warp(uint256(endAt) + 1);
        vm.expectRevert("pledged >= goal");
        vm.prank(alice);
        fund.refund(id);
    }

    function test_Refund_ReturnsContributionOnFailedCampaign() public {
        uint256 id = _launchAndStart();
        vm.prank(alice);
        fund.pledge(id, 250e18);
        vm.warp(uint256(endAt) + 1);

        vm.prank(alice);
        fund.refund(id);

        assertEq(fund.pledgedAmount(id, alice), 0);
        assertEq(token.balanceOf(alice), 10_000e18);
    }

    function test_Refund_ZeroContributionIsNoOpTransfer() public {
        uint256 id = _launchAndStart();
        vm.warp(uint256(endAt) + 1);
        uint256 before = token.balanceOf(bob);
        vm.prank(bob);
        fund.refund(id);
        assertEq(token.balanceOf(bob), before);
        assertEq(fund.pledgedAmount(id, bob), 0);
    }
}
