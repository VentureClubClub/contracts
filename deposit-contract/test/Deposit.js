/* global require, ethers, describe, it, beforeEach, Buffer, TextEncoder*/
const { assert, expect } = require('chai');


describe("Deposit contract", () => {
  let deposit;
  let erc20;
  let fabricCrowdFi;
  let feeRecipient;
  let project;
  let operator;
  let alice;
  let bob;

  beforeEach(async () => {
    [operator, feeRecipient, project, alice, bob] = await ethers.getSigners();
    const ERC20 = await ethers.getContractFactory("MockERC20");
    erc20 = await ERC20.deploy(ethers.parseEther("1000000"));
    const Deposit = await ethers.getContractFactory("Deposit");
    deposit = await Deposit.deploy(
      feeRecipient.address,
      project.address,
      operator.address,
    );
    await erc20.waitForDeployment();
    const FabricCrowdFi = await ethers.getContractFactory("MockFabricCrowdFi")
    fabricCrowdFi = await FabricCrowdFi.deploy(await erc20.getAddress())
    await fabricCrowdFi.waitForDeployment();
    await deposit.waitForDeployment();
  });

  it("Respects the states", async () => {
    // enum State {DEPLOYED, READY, FUNDED};
    // starts in DEPLOYED
    expect(await deposit.getState()).to.be.equal(0)

    // cannot fund
    await expect(deposit.connect(operator).fund()).to.be.revertedWith("Deposit: state is not READY")

    // can setCrowdFi
    await expect(deposit.connect(operator).setCrowdFi(await fabricCrowdFi.getAddress())).not.to.be.reverted

    // now in READY
    expect(await deposit.getState()).to.be.equal(1)

    // cannot setCrowdFi
    await expect(deposit.connect(operator).setCrowdFi(
      await fabricCrowdFi.getAddress())
    ).to.be.revertedWith('Deposit: CrowdFi already set')

    await erc20.transfer(await deposit.getAddress(0), ethers.parseEther("10"))

    // can fund
    await expect(deposit.connect(operator).fund()).not.to.be.reverted

    // now in FUNDED
    expect(await deposit.connect(operator).getState()).to.be.equal(2)

    // cannot setCrowdFi
    await expect(deposit.connect(operator).setCrowdFi(
      await fabricCrowdFi.getAddress())
    ).to.be.revertedWith('Deposit: CrowdFi already set')

    // cannot fund
    await expect(deposit.connect(operator).fund()).to.be.revertedWith('Deposit: state is not READY')
  });

  async function checkCase(c) {
    // set up investments
    fabricCrowdFi.mint(
      c.aliceMint ?
        await deposit.target :
        await alice.getAddress(),
      c.aliceInvests)
    fabricCrowdFi.mint(
      c.bobMint ?
        await deposit.target :
        await bob.getAddress(),
      c.bobInvest)

    await erc20.mint(deposit.target, c.aliceInvests + c.bobInvest)

    // confirm fund does the right thing
    await deposit.fund()

    // confirm the funds went to the right places
    expect(await erc20.balanceOf(await project.getAddress())).to.be.equal(c.projectGets)
    expect(await erc20.balanceOf(await feeRecipient.getAddress())).to.be.equal(c.fee)
    expect(await erc20.balanceOf(await deposit.getAddress())).to.be.equal(0)
    expect(await erc20.balanceOf(fabricCrowdFi.target)).to.be.equal(c.crowdFiGets)
  }

  it("sends collected funds correctly case 1", async () => {
    checkCase({
      aliceInvests: 100,
      aliceMint: true,
      bobInvest: 50,
      bobMint: false,
      projectGets: 100,
      crowdFiGets: 50 * 0.9,
      fee: 50 * 0.1
    })
  });

  it("sends collected funds correctly case 2", async () => {
    checkCase({
        aliceInvests: 10,
        aliceMint: false,
        bobInvest: 25,
        bobMint: false,
        projectGets: 0,
        crowdFiGets: 35 * 0.9,
        fee: 35 * 0.1
    })
  });

  it("sends collected funds correctly case 3", async () => {
    checkCase({
        aliceInvests: 300,
        aliceMint: true,
        bobInvest: 150,
        bobMint: true,
        projectGets: 450,
        crowdFiGets: 0,
        fee: 0
    });
  });
});
