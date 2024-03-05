/* global require, ethers, describe, it, beforeEach, Buffer, TextEncoder*/
const { assert, expect } = require('chai');
const { upgrades } = require('hardhat');

function monthsAgo(months) {
  const now = new Date();
  now.setMonth(now.getMonth() - months);
  return Math.floor(now.getTime() / 1000);
}

describe("Tranfers", function() {
  let vc, vcCompliance, vcData, deployer;
  let notKYCed,
      usAccredited,
      usNonAccredited,
      nonUs;
  let newDeal,
      midDeal,
      oldDeal;

  beforeEach(async function() {
    [deployer, notKYCed, usAccredited, usNonAccredited, nonUs] = await ethers.getSigners();
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
    const VCData = await ethers.getContractFactory("VCData");
    vcData = await VCData.deploy(
        deployer.address,
        deployer.address,
        deployer.address,
    );
    await vcData.waitForDeployment();
    const VCCompliance = await ethers.getContractFactory("VCCompliance");
    vcCompliance = await VCCompliance.deploy(await vcData.getAddress());
    await vcCompliance.waitForDeployment();

    const V3 = await ethers.getContractFactory('VentureClubUpgradeable_v3');
    vc = await upgrades.upgradeProxy(await vc.getAddress(), V3);
    await vc.setCompliance(await vcCompliance.getAddress());

    const TestToken = await ethers.getContractFactory("TestToken")
    const testToken = await TestToken.deploy(ethers.parseEther("1000000"));
    await testToken.waitForDeployment();

    newDeal = ["0x0000000000000000000000000000000000000000000000000000000000000000", monthsAgo(2)]
    midDeal = ["0x0000000000000000000000000000000000000000000000000000000000000001", monthsAgo(8)]
    oldDeal = ["0x0000000000000000000000000000000000000000000000000000000000000002", monthsAgo(24)]

    await vcData.setDealAssetIssueDate(...newDeal);
    await vcData.setDealAssetIssueDate(...midDeal);
    await vcData.setDealAssetIssueDate(...oldDeal);

    const kyc = {
      Unknown: 0,
      Valid: 1,
      Lapsed: 2,
      Rejected: 3,
    }
    const accreditation = {
      Unknown: 0,
      NotAccredited: 1,
      SelfAccredited: 2,
      VerifiedAccredited: 3,
    }
    await vcData.addAccount("CA", accreditation.VerifiedAccredited, kyc.Lapsed, [notKYCed.address])
    await vcData.addAccount("US", accreditation.VerifiedAccredited, kyc.Valid, [usAccredited.address])
    await vcData.addAccount("US", accreditation.NotAccredited, kyc.Valid, [usNonAccredited.address])
    await vcData.addAccount("CA", accreditation.VerifiedAccredited, kyc.Valid, [nonUs.address])


    const grant = new Uint8Array(32);
    await vc.createDeal(newDeal[0], deployer.address, await testToken.getAddress(), grant);
    await vc.createDeal(midDeal[0], deployer.address, await testToken.getAddress(), grant);
    await vc.createDeal(oldDeal[0], deployer.address, await testToken.getAddress(), grant);
    await vc.mint(deployer.address, newDeal[0], 0, grant);
    await vc.mint(deployer.address, midDeal[0], 0, grant);
    await vc.mint(deployer.address, oldDeal[0], 0, grant);
  });

/*

US	Accredited	2  month	NOT ALLOWED
US	Accredited	8  month	ALLOWED
US	Non Accredited	8  month	NOT ALLOWED
US	Non Accredited	24 month	ALLOWED
Non US	Non Accredited	8  month	ALLOWED

*/

  it("does not allow transfer of 2 month old asset to US accredited", async function() {
    console.log("us accredited", usAccredited.address)
    vc.approve(usAccredited.address, 0);
    await expect(vc.connect(usAccredited).transferFrom(deployer.address, usAccredited.address, 0))
      .to.be.revertedWith("VentureClubUpgradable_v3: Transfer not allowed");
  });

  it("allows transfer of 8 month old asset to US accredited", async function() {
    vc.approve(usAccredited.address, 1);
    await expect(vc.connect(usAccredited).transferFrom(deployer.address, usAccredited.address, 1))
      .not.to.be.reverted;
  });

  it("does not allow transfer of 8 month old asset to US non-accredited", async function() {
    vc.approve(usNonAccredited.address, 1);
    await expect(vc.connect(usNonAccredited).transferFrom(deployer.address, usNonAccredited.address, 1))
      .to.be.revertedWith("VentureClubUpgradable_v3: Transfer not allowed");
  });

  it("allows transfer of 24 month old asset to US non-accredited", async function() {
    vc.approve(usNonAccredited.address, 2);
    await expect(vc.connect(usNonAccredited).transferFrom(deployer.address, usNonAccredited.address, 2))
      .not.to.be.reverted;
  });

  it("allows transfer of 8 month old asset to non-US non-accredited", async function() {
    vc.approve(nonUs.address, 1);
    await expect(vc.connect(nonUs).transferFrom(deployer.address, nonUs.address, 1))
      .not.to.be.reverted;
  });
})
