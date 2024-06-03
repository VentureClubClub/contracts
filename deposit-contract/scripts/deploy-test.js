const { ethers, network, run, upgrades } = require('hardhat');

async function main() {
  console.log(ethers.parseEther('1000000').toString());
  throw new Error('stop');
  console.log('network:', network.name);
  const [deployer] = await ethers.getSigners();
  console.log('deployer', await deployer.getAddress());
  const TestToken = await ethers.getContractFactory('TestERC20');
  const testToken = await TestToken.deploy(ethers.parseEther('1000000'));
  await testToken.waitForDeployment()
  console.log('Deposit deployed to:', testToken.target);

  // wait for 8 confirmations
  await testToken.deployTransaction.wait(8);

  // verify
  await run('verify:verify', {
    address: testToken.address,
    constructorArguments: [ethers.parseEther('1000000')],
  })
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
