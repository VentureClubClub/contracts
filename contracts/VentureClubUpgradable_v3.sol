// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Uncomment this line to use console.log
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./Compliance.sol";

contract VentureClubUpgradeable_v3 is Initializable, ERC721Upgradeable, AccessControlUpgradeable {
    // V1 STORAGE DO NOT CHANGE
    using Address for address;
    using Strings for uint256;
    using Strings for address;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes;
    using ECDSA for bytes;

    uint256 internal _tokenIds;

    bytes32 public constant TOKEN_ADMIN = keccak256("TOKEN_ADMIN");
    bytes32 public constant DEAL_ADMIN = keccak256("DEAL_ADMIN");

    struct Deal {
        address manager;
        address currency; // the token used for the raise
    }

    mapping(bytes32 => Deal) public deals;

    mapping(uint256 => bool) public lockedTokens;

    // Deprecated
    mapping(address => bool) public allowedContracts;

    string public tokenURIprefix;
    string public tokenURIsuffix;

    // END V1 STORAGE

    // V2 STORAGE
    // no new storage
    // END V2 STORAGE

    // V3 STORAGE

    VCCompliance public complianceContract;
    mapping(uint256 => bytes32) public dealsByTokenId;

    // END V3 STORAGE

    // Checks that the specific callId (msg.sender and any relevant
    // args) of this call was signed (granted) by the correct admin
    // NOTICE: the permission granted is good for ANY NUMBER OF CALLS
    modifier granted(bytes memory callId, bytes memory signature, bytes32 granterRole) {
        if (hasRole(granterRole, msg.sender)) {
            _;
            return;
        }
        bytes memory callSig = abi.encode(msg.sig, callId);
        address signer = callSig.toEthSignedMessageHash().recover(signature);
        require(hasRole(granterRole, signer), "VCNFTUpgradeable: invalid grant");
        _;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // returns a token URI in the form
    // https://app.ventureclub.club/tokenmeta/1/{contractAddress}/{tokenId}.json
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        // token uri scheme
        // {prefix(https://ventureclub.club/api/nft)}{chainId}/{contractAddress}/{tokenId}{suffix(/meta)}
        return string.concat(tokenURIprefix, // https://ventureclub.club/api/nft/
                             block.chainid.toString(), "/",
                             address(this).toHexString(), "/",
                             Strings.toString(tokenId),
                             tokenURIsuffix // /meta
                             );
    }

    event URIupdated(string exampleURI);
    function setTokenURI(string memory prefix, string memory suffix, bytes memory grant) external
        granted(abi.encode(msg.sender, prefix, suffix), grant, TOKEN_ADMIN) {
        tokenURIprefix = prefix;
        tokenURIsuffix = suffix;
        emit URIupdated(tokenURI(0));
    }

    event DealCreated(bytes32 id, address dealManager, address currency);

    // createDeal registers details for a Deal allowing people to claim an
    // opportunity to invest
    function createDeal(bytes32 id,
                        address dealManager,
                        address currency,
                        bytes memory grant
                        )
        granted(abi.encode(msg.sender, id, dealManager, currency), grant, DEAL_ADMIN)
        external
    {
        require(deals[id].manager == address(0), "VCNFT: Deal exists");

        Deal storage deal = deals[id];
        deal.manager = dealManager;
        deal.currency = currency;

        emit DealCreated(id, dealManager, currency);
    }

    event Mint(address to, uint256 tokenId, bytes32 dealId, uint256 price);
    function mint(address to, bytes32 dealId, uint256 price, bytes memory grant)
        granted(abi.encode(msg.sender, to, dealId, price), grant, TOKEN_ADMIN)
        external
    {
        require(deals[dealId].manager != address(0), "VCNFT: Deal does not exist");
        IERC20 erc20 = IERC20(deals[dealId].currency);
        require(erc20.transferFrom(msg.sender, deals[dealId].manager, price),
                "VCNFT: Payment failed");

        uint256 tokenId = _tokenIds;
        _tokenIds += 1;
        _mint(to, tokenId);
        dealsByTokenId[tokenId] = dealId;

        emit Mint(to, tokenId, dealId, price);
    }

    event Burn(uint256 tokenId, string reason);
    function burn(uint256 tokenId, string calldata reason, bytes memory grant) external
        granted(abi.encode(msg.sender, tokenId, reason), grant, TOKEN_ADMIN) {
        lockedTokens[tokenId] = false;
        delete dealsByTokenId[tokenId];
        _burn(tokenId);
        emit Burn(tokenId, reason);
    }

    event SetLocked(uint256 tokenId, bool locked, string reason);
    function setLocked(uint256 tokenId, bool locked, string calldata reason, bytes memory grant) external
        granted(abi.encode(msg.sender, tokenId, locked, reason), grant, TOKEN_ADMIN)
    {
        lockedTokens[tokenId] = locked;
        emit SetLocked(tokenId, locked, reason);
    }

    event SetCompliance(address complianceContract);
    function setCompliance(address _complianceContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        complianceContract = VCCompliance(_complianceContract);
        emit SetCompliance(_complianceContract);
    }

    function _requireTransferAllowed(address from, address to, uint256 tokenId) internal virtual {
        require(lockedTokens[tokenId] == false, "VCNFT: Token is locked");
        require(
            complianceContract.transferAllowed(msg.sender, to, dealsByTokenId[tokenId]),
            "VentureClubUpgradable_v3: Transfer not allowed"
        );
    }

    function transferFrom(address from, address to, uint256 tokenId) public override virtual {
        _requireTransferAllowed(from, to, tokenId);
        super.transferFrom(from, to, tokenId);
    }
}

