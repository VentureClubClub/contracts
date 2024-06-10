/* global require, ethers, describe, it, beforeEach, Buffer, TextEncoder*/
const { assert, expect } = require('chai');
const { upgrades } = require('hardhat');

describe("Decimals", function () {
  let vc, deployer, alice, testToken;

  const tokenIds = [
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000002",
  ];

  beforeEach(async function () {
    [deployer, alice] = await ethers.getSigners();
    vc = await upgrades.deployProxy(
      await ethers.getContractFactory("VentureClubUpgradeable"),
      [
        "VentureClub",
        "VC",
        deployer.address,
        deployer.address,
        deployer.address,
        "uriPrefix",
        "uriSuffix",
      ],
      { initializer: 'initialize' }
    );
    await vc.waitForDeployment();
    const V4 = await ethers.getContractFactory('VentureClubUpgradeable_v4');
    vc = await upgrades.upgradeProxy(await vc.getAddress(), V4);
    await vc.setCompliance(ethers.ZeroAddress);

    const TestToken = await ethers.getContractFactory("TestToken_v4")
    testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
    await testToken.mint(await alice.getAddress());

    const grant = new Uint8Array(32);
    await vc.createDeal(tokenIds[0], await alice.getAddress(), await testToken.getAddress(), 18, grant);
    await vc.createDeal(tokenIds[1], await alice.getAddress(), await testToken.getAddress(), 6, grant);
    await vc.createDeal(tokenIds[2], await alice.getAddress(), await testToken.getAddress(), 0, grant);
  });

  it("Tracks decimals and transfers the correct amount", async function () {
    const weiAmount = ethers.parseEther("500")
    testToken.approve(await vc.getAddress(), weiAmount);
    const grant = new Uint8Array(32);
    await expect(
      vc.mint(await deployer.getAddress(), tokenIds[0], 500, grant)
    ).to.changeTokenBalances(testToken, [deployer, alice], [-weiAmount, weiAmount])

    const usdcAmount = 500 * 10 ** 6;
    testToken.approve(await vc.getAddress(), usdcAmount);
    await expect(
      vc.mint(await deployer.getAddress(), tokenIds[1], 500, grant)
    ).to.changeTokenBalances(testToken, [deployer, alice], [-usdcAmount, usdcAmount])

    testToken.approve(await vc.getAddress(), usdcAmount);
    await expect(
      vc.mint(await deployer.getAddress(), tokenIds[2], 500, grant)
    ).to.changeTokenBalances(testToken, [deployer, alice], [-usdcAmount, usdcAmount])
})
});
