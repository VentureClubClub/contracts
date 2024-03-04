// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

contract MockCompliance {

    mapping (address => mapping (address => mapping(address => mapping(bytes32 => bool)))) public allowed;

    function transferAllowed(
        address transferCaller,
        address from,
        address to,
        bytes32 dealId
    ) public view returns (bool) {
        return allowed[transferCaller][from][to][dealId];
    }

    function setAllowed(
        address transferCaller,
        address from,
        address to,
        bytes32 dealId,
        bool value
    ) public {
        allowed[transferCaller][from][to][dealId] = value;
    }
}
