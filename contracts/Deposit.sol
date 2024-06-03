// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "hardhat/console.sol";

contract Deposit is AccessControl {
    bytes32 public constant OPERATOR = keccak256("OPERATOR");

    address public fabricCrowdFi;
    address public feeRecipient;
    address public fundsRecipient;
    address public fundCurrency;

    enum State {DEPLOYED, READY, FUNDED}
    State public state;

    constructor (address _feeRecipient, address _fundsRecipient, address operator) {
        feeRecipient = _feeRecipient;
        fundsRecipient = _fundsRecipient;
        _grantRole(OPERATOR, operator);
        state = State.DEPLOYED;
    }

    function setCrowdFi(address _fabricCrowdFi) public onlyRole(OPERATOR) {
        require(fabricCrowdFi == address(0), "Deposit: CrowdFi already set");
        state = State.READY;
        fabricCrowdFi = _fabricCrowdFi;
        fundCurrency = IFabricCrowdFi(fabricCrowdFi).erc20Address();
    }

    event Funded(address currency, uint256 amount, address recipient);
    function fund() external onlyRole(OPERATOR) {
        require(state == State.READY, "Deposit: state is not READY");
        state = State.FUNDED;

        uint256 collectedAmount = IERC20(fundCurrency).balanceOf(address(this));

        uint256 investedAmount = IERC20(fabricCrowdFi).balanceOf(address(this));
        require(investedAmount <= collectedAmount, "Deposit: investedAmount > collectedAmount");

        uint256 uninvestedAmount = collectedAmount - investedAmount;

        uint256 feeAmount = uninvestedAmount / 10;

        uint256 yieldAmount = (collectedAmount / 10) * 9;

        IERC20(fundCurrency).approve(fabricCrowdFi, yieldAmount);

        IFabricCrowdFi(fabricCrowdFi).yieldERC20(yieldAmount);
        IFabricCrowdFi(fabricCrowdFi).withdraw();

        require(IERC20(fundCurrency).transfer(feeRecipient, feeAmount), "Deposit: fee transfer failed");
        require(IERC20(fundCurrency).transfer(fundsRecipient, investedAmount), "Deposit: funds transfer failed");
    }

    function withdraw() external onlyRole(OPERATOR) {
        require(IFabricCrowdFi(fabricCrowdFi).isWithdrawAllowed(), "Deposit: Withdraw not allowed");

        IFabricCrowdFi(fabricCrowdFi).withdraw();
        uint256 amount = IERC20(fundCurrency).balanceOf(address(this));

        require(IERC20(fundCurrency).transfer(fundsRecipient, amount), "Deposit: withdraw transfer failed");
    }
}

interface IFabricCrowdFi {
    function isWithdrawAllowed() external view returns (bool);
    function erc20Address() external returns (address);
    function yieldERC20(uint256 amount) external;
    function withdraw() external;
}

contract MockFabricCrowdFi is ERC20 {
    address public erc20;

    constructor(address _erc20Address) ERC20("FabricCrowdFi", "FCF") {
        erc20 = _erc20Address;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function erc20Address() external view returns (address) {
        return erc20;
    }

    function yieldERC20(uint256 amount) external {
        require(IERC20(erc20).transferFrom(msg.sender, address(this), amount));
    }

    function withdraw() external {
        // transfer erc20 to msg.sender in proportion to their balance in this contract
        uint256 balance = IERC20(erc20).balanceOf(address(this));
        if (balance == 0) return;
        uint256 totalSupply = totalSupply();
        if(totalSupply == 0) return;
        uint256 share = balanceOf(msg.sender) / totalSupply;
        uint256 amount = balance * share;
        require(IERC20(erc20).transfer(msg.sender, amount));
    }
}

contract MockERC20 is ERC20 {

    constructor(uint256 initialSupply) ERC20("MockERC20", "MERC") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

