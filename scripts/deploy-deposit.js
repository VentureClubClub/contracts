const { ethers, network, run, upgrades } = require('hardhat');

const feeRecipient = ''
const fundsRecipient = ''

async function main() {
  console.log('network:', network.name);
  const [deployer] = await ethers.getSigners();
  console.log(await deployer.getAddress());
  const Deposit = await ethers.getContractFactory('Deposit');
  const deposit = await Deposit.deploy(feeRecipient, fundsRecipient, await deployer.getAddress());
  await deposit.waitForDeployment()
  console.log('Deposit deployed to:', deposit.target);

  console.log(`verify with: npx hardhat verify --network ${network.name} ${deposit.target} ${feeRecipient} ${fundsRecipient} ${await deployer.getAddress()}`);

  // verify
  await run('verify:verify', {
    address: deposit.target,
    constructorArguments: [feeRecipient, fundsRecipient, await deployer.getAddress()],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
