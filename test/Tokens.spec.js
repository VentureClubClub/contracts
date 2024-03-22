/* global require, ethers, describe, it, beforeEach, Buffer, TextEncoder*/
const { assert, expect } = require('chai');
const { upgrades } = require('hardhat');

describe("Tokens", function() {
  let vcToken, deployer, admin, name, symbol

  beforeEach(async function() {
    [deployer, admin] = await ethers.getSigners();
    name = "VENTURE CLUB UNITTEST NAME"
    symbol = "VCUNITTESTN"

    vcToken = await upgrades.deployProxy(
      await ethers.getContractFactory("VentureClubTokenUpgradable_v0"),
      [name, symbol, admin.address],
      { initializer: 'initialize' }
    );
  });

  it("initializes with expected settings", async function() {
    expect(await vcToken.name()).to.equal(name)
    expect(await vcToken.symbol()).to.equal(symbol)
    expect(await vcToken.decimals()).to.equal(18)
    expect(await vcToken.hasRole(ethers.encodeBytes32String(''), admin.address)).to.equal(true)
  })

  it("only allows admin to mint and burn", async function() {
    const amount = ethers.parseEther('1')
    await expect(vcToken.mint(deployer.address, amount)).to.be.reverted
    await expect(vcToken.connect(admin).mint(deployer.address, amount)).not.to.be.reverted
    await expect(vcToken.burn(deployer.address, amount)).to.be.reverted
    expect(await vcToken.balanceOf(deployer.address)).to.equal(amount)
    await expect(vcToken.connect(admin).burn(deployer.address, amount)).not.to.be.reverted
    expect(await vcToken.balanceOf(deployer.address)).to.be.equal(0)
  });
});
