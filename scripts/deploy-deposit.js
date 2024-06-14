/* global require */
const { ethers, network, run, upgrades } = require('hardhat');

const feeRecipient = '0xD8E43dE65F2c7c2C3158046Fe55aDB45C86F99f8'
const fundsRecipient = '0xD8E43dE65F2c7c2C3158046Fe55aDB45C86F99f8'

async function main() {
  console.log('network:', network.name);
  const [deployer] = await ethers.getSigners();
  console.log("deployer address", await deployer.getAddress());
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
