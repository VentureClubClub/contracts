/* global require process */

const hre = require('hardhat');
var prompt = require('prompt-sync')();
require('dotenv').config();

const { ethers, upgrades } = hre;

const NAME = process.env.VC_TOKEN_NAME;
const SYMBOL = process.env.VC_TOKEN_SYMBOL;

var DEFAULT_ADMIN_ADDRESS;
var VC_TOKEN_ADDRESS;
var VC_TOKEN_ADDRESS_NAME;
switch(hre.network.name) {
case 'sepolia':
  VC_TOKEN_ADDRESS = process.env.SEPOLIA_VC_TOKEN_ADDRESS;
  VC_TOKEN_ADDRESS_NAME = 'SEPOLIA_VC_TOKEN_ADDRESS'
  DEFAULT_ADMIN_ADDRESS = process.env.SEPOLIA_VC_TOKEN_DEFAULT_ADMIN_ADDRESS;
  break;
case 'base':
  VC_TOKEN_ADDRESS = process.env.BASE_VC_TOKEN_ADDRESS;
  VC_TOKEN_ADDRESS_NAME = 'BASE_VC_TOKEN_ADDRESS'
  DEFAULT_ADMIN_ADDRESS = process.env.BASE_VC_TOKEN_DEFAULT_ADMIN_ADDRESS;
  break;
case 'hardhat':
  VC_TOKEN_ADDRESS = process.env.HARDHAT_VC_TOKEN_ADDRESS;
  VC_TOKEN_ADDRESS_NAME = 'HARDHAT_VC_TOKEN_ADDRESS'
  DEFAULT_ADMIN_ADDRESS = process.env.HARDHAT_VC_TOKEN_DEFAULT_ADMIN_ADDRESS;
  break;
default:
  throw new Error(`Unsupported network (${hre.network.name}), add it to the deploy script switch statement`)
}

function continuePrompt() {
  const response = prompt('Continue? (y/n) ');
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});  if (response.toLowerCase() !== 'y') {
    process.exit(0);
  }
}

if (!NAME || !SYMBOL || !DEFAULT_ADMIN_ADDRESS) {
  throw new Error(`please set VC_TOKEN_NAME, VC_TOKEN_SYMBOL, and ${hre.network.name.toUpperCase()}_VC_TOKEN_DEFAULT_ADMIN_ADDRESS in the environment`)
}

if (!!VC_TOKEN_ADDRESS) {
  console.log(`WARNING: Already deployed to ${VC_TOKEN_ADDRESS}`)
  continuePrompt()
}

async function main() {
  console.log("deploying Venture Club ERC20 Token to", hre.network.name)

  let contract
  if(!VC_TOKEN_ADDRESS) {
    const ContractFactory = await ethers.getContractFactory('VentureClubTokenUpgradable_v0');
    const initArgs = [NAME, SYMBOL, DEFAULT_ADMIN_ADDRESS]
    console.log('deploying with args', initArgs)
    contract = await upgrades.deployProxy(ContractFactory, initArgs, {initializer: 'initialize'})
    await contract.waitForDeployment();
    console.log("VentureClubTokenUpgradable_v0 deployed to", await contract.getAddress());
    console.log("add it to the .env file")
    console.log(
      `${VC_TOKEN_ADDRESS_NAME}=${await contract.getAddress()}`
    );
    if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
      process.exit(0)
    }
    console.log();
    console.log('waiting 6 blocks before verifying');
    await contract.deploymentTransaction().wait(6);
  } else {
    contract = await ethers.getContractAt('VentureClubTokenUpgradable_v0', VC_TOKEN_ADDRESS);
    console.log("VentureClubTokenUpgradable_v0 already deployed to:",VC_TOKEN_ADDRESS);
  }

  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    process.exit(0);
  }

  await hre.run('verify:verify', {
    address: await contract.getAddress(),
    constructorArguments: []
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
