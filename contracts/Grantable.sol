// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "hardhat/console.sol";

/*
 * Grantable allows offchain permissioning
 *
 * by using the `granted` modifier you can specify what data (usually
 * function arguments and the caller) must be included in a `grant`
 * and what role is allowed to grant that permission.
 *
 * granted will check that the signer of the grant has the required
 * role
 *
 * use the `grant` function to register a grant for future use with
 * the modifier `wasGranted`. This is useful for granting permissions
 * to functions that can't take extra grant arguments (like functions
 * that are specified in an ERC standard)
 */


contract Grantable is AccessControl {
    using ECDSA for bytes32;
    using ECDSA for bytes;

    struct Grant {
        bytes signature;
        bytes32 nonce;
        uint256 expiryBlock;
    }

    mapping (bytes => Grant) public grants; // callId => Grant

    mapping (bytes32 => bool) public registeredNonces; // nonce => used
    mapping (bytes32 => bool) public executedNonces; // nonce => called

    function verifyGrant(
        bytes memory callId,
        bytes32 granterRole,
        bytes memory signature,
        bytes32 nonce,
        uint256 expiryBlock
    ) internal {
        require(!executedNonces[nonce], "Grantable: nonce already executed");
        executedNonces[nonce] = true;
        require(expiryBlock > block.number, "Grantable: grant expired");
        bytes32 hash = abi.encode(msg.sig, callId, nonce, expiryBlock).toEthSignedMessageHash();
        address signer = ECDSA.recover(hash, signature);
        require(hasRole(granterRole, signer), "Grantable: Invalid grant");
    }

    modifier granted(
        bytes memory callId,
        bytes32 granterRole,
        bytes memory signature,
        bytes32 nonce,
        uint256 expiryBlock
    ) {
        verifyGrant(callId, granterRole, signature, nonce, expiryBlock);
        _;
    }

    modifier wasGranted(bytes memory callId, bytes32 granterRole) {
        // signature needs to include a nonce and a block number
        Grant storage grant = grants[callId];
        verifyGrant(callId, granterRole, grant.signature, grant.nonce, grant.expiryBlock);
        delete grants[callId];
        _;
    }

    function setGranted(
        bytes memory callId,
        bytes memory signature,
        bytes32 nonce,
        uint256 expiryBlock
    ) public {
        require(block.number <= expiryBlock, "Grantable: grant expired");
        require(!registeredNonces[nonce], "Grantable: nonce already used");
        registeredNonces[nonce] = true;
        grants[callId] = Grant(signature, nonce, expiryBlock);
    }
}

contract GrantableTest is Grantable {

    bytes32 public constant GRANTER = keccak256("GRANTER");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function testMethodA(
        bytes memory b,
        uint256 n,
        bytes memory signature,
        bytes32 nonce,
        uint256 expiryBlock
    ) granted(abi.encode(msg.sender, b, n), GRANTER, signature, nonce, expiryBlock)
      external returns (bool) {
        return true;
    }

    // Second test method with the same argument signature to verify
    // that a grant for one can't be used for the other
    function testMethodB(
        bytes memory b,
        uint256 n,
        bytes memory signature,
        bytes32 nonce,
        uint256 expiryBlock
    ) granted(abi.encode(msg.sender, b, n), GRANTER, signature, nonce, expiryBlock)
      external returns (bool) {
        return false;
    }

    function testWasGranted(bytes memory a, uint256 n)
        wasGranted(abi.encode(msg.sender, a, n), GRANTER)
        external returns (bool) {
        return true;
    }
}


