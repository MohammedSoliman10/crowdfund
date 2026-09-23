// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockToken} from "../src/mocks/MockToken.sol";
import {CrowdFund} from "../src/CrowdFund.sol";

/// Deploys the pledge token and the crowdfunding contract, logging both
/// addresses for wiring into frontend/src/config/contracts.ts.
contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();
        MockToken token = new MockToken("Crowd Fund Token", "CFT");
        CrowdFund fund = new CrowdFund(address(token));
        vm.stopBroadcast();

        console.log("MockToken:", address(token));
        console.log("CrowdFund:", address(fund));
    }
}
