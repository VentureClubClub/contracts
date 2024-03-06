// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "hardhat/console.sol";

contract VCData is AccessControl {
    bytes32 public constant MASTER_ACCOUNT_ADMIN = keccak256("MASTER_ACCOUNT_ADMIN");
    bytes32 public constant ACCOUNT_ADMIN = keccak256("ACCOUNT_ADMIN");
    bytes32 public constant DEAL_ADMIN = keccak256("DEAL_ADMIN");
    bytes32 public constant CONTRACT_ADMIN = keccak256("CONTRACT_ADMIN");

    enum AccreditationStatus { Unknown, NotAccredited, SelfAccredited, VerifiedAccredited }
    enum KYCStatus { Unknown, Valid, Lapased, Rejected }

    error NOT_ADMIN();

    struct Account {
        string countryCode;
        AccreditationStatus accreditationStatus;
        KYCStatus kycStatus;
        address admin;
    }

    uint256 private currentAccountId;

    mapping(uint256 => Account) public accounts;
    mapping(address => uint256) public accountIds;

    mapping(bytes32 => uint256) public dealAssetIssueDates;

    // Allowed Lockers are contracts that can lock assets and call
    // transfers contracts or Rarible's auction house and marketplace,
    // or loan contracts,
    mapping(address => bool) public allowedContracts;

    constructor(address _accountAdmin, address _dealAdmin, address _contractAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ACCOUNT_ADMIN, _accountAdmin);
        _grantRole(MASTER_ACCOUNT_ADMIN, _accountAdmin);
        _grantRole(DEAL_ADMIN, _dealAdmin);
        _grantRole(CONTRACT_ADMIN, _contractAdmin);
    }

    event AccountAdded(
        uint256 indexed accountId,
        string countryCode,
        AccreditationStatus accreditationStatus,
        KYCStatus kycStatus,
        address[] addresses
    );
    function addAccount(
        string memory _countryCode,
        AccreditationStatus _accreditationStatus,
        KYCStatus _kycStatus,
        address[] memory addresses
    ) external onlyRole(ACCOUNT_ADMIN) {
        currentAccountId;
        uint256 newAccountId = currentAccountId;
        accounts[newAccountId] = Account({
            countryCode: _countryCode,
            accreditationStatus: _accreditationStatus,
            kycStatus: _kycStatus,
            admin: msg.sender
        });
        for (uint256 i = 0; i < addresses.length; i++) {
            accountIds[addresses[i]] = newAccountId;
        }
        emit AccountAdded(newAccountId, _countryCode, _accreditationStatus, _kycStatus, addresses);
    }

    event AccountUpdated(
        uint256 indexed accountId,
        string countryCode,
        AccreditationStatus accreditationStatus,
        KYCStatus kycStatus
    );
    function updateAccount(
        uint256 accountId,
        string memory _countryCode,
        AccreditationStatus _accreditationStatus,
        KYCStatus _kycStatus
    ) external onlyRole(ACCOUNT_ADMIN) {
        address admin = accounts[accountId].admin;
        if (msg.sender != admin) { revert NOT_ADMIN(); }

        accounts[accountId] = Account({
            countryCode: _countryCode,
            accreditationStatus: _accreditationStatus,
            kycStatus: _kycStatus,
            admin: admin
        });

        emit AccountUpdated(accountId, _countryCode, _accreditationStatus, _kycStatus);
    }

    function getAccount(address _addr) public view returns (Account memory) {
        return accounts[accountIds[_addr]];
    }

    function addAddresses(address[] memory addresses_, uint256[] memory accountIds_)
        external onlyRole(ACCOUNT_ADMIN)
    {
        require(addresses_.length == accountIds_.length, "VCData: addresses and accountIds length mismatch");
        for (uint256 i = 0; i < addresses_.length; i++) {
            addAddress(addresses_[i], accountIds_[i]);
        }
    }

    event AddressAdded(address indexed addr, uint256 indexed accountId);

    function addAddress(address addr_, uint256 accountId_) public onlyRole(ACCOUNT_ADMIN) {
        address admin = accounts[accountId_].admin;
        if (msg.sender != admin) { revert NOT_ADMIN(); }

        accountIds[addr_] = accountId_;
        emit AddressAdded(addr_, accountId_);
    }

    event AddressRemoved(address indexed addr);

    function removeAddress(address addr) external onlyRole(ACCOUNT_ADMIN) {
        address admin = accounts[accountIds[addr]].admin;
        if (msg.sender != admin) { revert NOT_ADMIN(); }

        delete accountIds[addr];
        emit AddressRemoved(addr);
    }

    event DealAssetIssueDateSet(bytes32 indexed dealId, uint256 assetIssueDate);

    function setDealAssetIssueDate(bytes32 _dealId, uint256 _assetIssueDate) external onlyRole(DEAL_ADMIN) {
        dealAssetIssueDates[_dealId] = _assetIssueDate;
        emit DealAssetIssueDateSet(_dealId, _assetIssueDate);
    }

    event AllowedContractSet(address _contract, bool allowed);
    function setAllowedContract(address _contract, bool allowed) external onlyRole(CONTRACT_ADMIN) {
        allowedContracts[_contract] = allowed;
        emit AllowedContractSet(_contract, allowed);
    }

    function getComplianceData(address _addr, bytes32 dealId) external view returns (Account memory, uint256) {
        return (accounts[accountIds[_addr]], dealAssetIssueDates[dealId]);
    }

    event AdminAdded(address admin);
    function addAdmin(address admin) external onlyRole(MASTER_ACCOUNT_ADMIN) {
        _grantRole(ACCOUNT_ADMIN, admin);
        emit AdminAdded(admin);
    }

    event AdminRemoved(address admin);
    function removeAdmin(address admin) external onlyRole(MASTER_ACCOUNT_ADMIN) {
        _revokeRole(ACCOUNT_ADMIN, admin);
        emit AdminRemoved(admin);
    }
}

contract VCCompliance is AccessControl {
    using Address for address;

    VCData public vcData;

    constructor(address _vcData) {
        vcData = VCData(_vcData);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setVCData(address _vcData) external onlyRole(DEFAULT_ADMIN_ROLE) {
        vcData = VCData(_vcData);
    }

    // _presumedWanted is true if we can assume the transfer is wanted
    // Presume it's wanted if
    // * it's being sent to the caller
    // * its' being sent to an allowed contract
    // * the caller is an allowed contract
    function _presumedWanted(address caller, address to) internal view returns (bool) {
        return to == caller
            || vcData.allowedContracts(to)
            || vcData.allowedContracts(caller);
    }

    function transferAllowed(
        address transferCaller,
        address to,
        bytes32 dealId
    ) public view returns (bool) {

        if (!_presumedWanted(transferCaller, to)) {
            return false;
        }

        if(vcData.allowedContracts(to)) {
            return true;
        }

        (VCData.Account memory recipient, uint256 issueDate) =
            VCData(vcData).getComplianceData(to, dealId);

        // require recipient KYC to be Valid
        if (recipient.kycStatus != VCData.KYCStatus.Valid) {
            return false;
        }

        // non-US can always receive
        if (keccak256(bytes(recipient.countryCode)) != keccak256(bytes("US"))) {
            return true;
        }

        if (issueDate == 0) { // not yet issued
            issueDate = block.timestamp;
        }

        // if OVER 1 year all US can receive
        if (block.timestamp - issueDate > 365 days) {
            return true;
        }

        // if less than 6 months, no US can receive
        if (block.timestamp - issueDate < 180 days) {
            if (block.timestamp == issueDate) { // not yet issued
                return recipient.accreditationStatus == VCData.AccreditationStatus.VerifiedAccredited;
            }
            return false;
        }

        // if OVER 6 months accredited (self or verified) US can receive
        if (recipient.accreditationStatus == VCData.AccreditationStatus.SelfAccredited ||
            recipient.accreditationStatus == VCData.AccreditationStatus.VerifiedAccredited) {
            return true;
        }

        return false;
    }
}
