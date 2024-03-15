/* global require, process */

const hre = require('hardhat');
var prompt = require('prompt-sync')();
require('dotenv').config();

const { ethers, upgrades } = hre;

const NAME = process.env.TOKEN_NAME;
const SYMBOL = process.env.TOKEN_SYMBOL;
const URI_PREFIX = process.env.TOKEN_URI_PREFIX;
const URI_SUFFIX = process.env.TOKEN_URI_SUFFIX;

var NFT_ADDRESS;
var NFT_ADDRESS_NAME;
switch (hre.network.name) {
case 'mainnet':
  NFT_ADDRESS = process.env.MAINNET_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'MAINNET_NFT_ADDRESS';
  break;
case 'optimism':
  NFT_ADDRESS = process.env.OPT_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'OPT_NFT_ADDRESS';
  break;
case 'base':
  NFT_ADDRESS = process.env.BASE_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'BASE_NFT_ADDRESS';
  break;
case 'goerli':
  NFT_ADDRESS = process.env.GOERLI_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'GOERLI_NFT_ADDRESS';
  break;
case 'sepolia':
  NFT_ADDRESS = process.env.SEPOLIA_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'SEPOLIA_NFT_ADDRESS';
  break;
case 'hardhat':
  NFT_ADDRESS = process.env.HARDHAT_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'HARDHAT_NFT_ADDRESS';
  break;
case 'localhost':
  NFT_ADDRESS = process.env.LOCALHOST_NFT_ADDRESS;
  NFT_ADDRESS_NAME = 'LOCALHOST_NFT_ADDRESS';
  break;
default:
  throw new Error('Unsupported network');
}

function continuePrompt() {
  const response = prompt('Continue? (y/n) ');
  if (response.toLowerCase() !== 'y') {
    process.exit(0);
  }
}

const NFT_UPGRADABLE_ADDRESS = process.env.NFT_UPGRADABLE_ADDRESS;
if (!NAME || !SYMBOL || !URI_PREFIX || !URI_SUFFIX) {
  throw new Error(
    'Please set TOKEN_NAME, TOKEN_SYMBOL, TOKEN_URI_PREFIX, and TOKEN_URI_SUFFIX environment variables'
  );
}
if (!!NFT_ADDRESS) {
  console.log(
    `WARNING: Already deployed to ${NFT_ADDRESS_NAME}=${NFT_ADDRESS}`
  );
  continuePrompt();
}

async function main() {
  const [deployer, tokenAdmin, dealAdmin] = await ethers.getSigners();
  console.log('Deploying NFT contracts to network:', hre.network.name);
  console.log(
    `with the accounts:\ndeployer: ${deployer.address}\ntokanAdmin: ${tokenAdmin.address}\ndealAdmin: ${dealAdmin.address}`
  );
  continuePrompt();

  let ventureClubUpgradable;
  if(!NFT_ADDRESS) {
    const VentureClubUpgradable = await ethers.getContractFactory(
      'VentureClubUpgradeable'
    );
    const deployArgs = [
      NAME,
      SYMBOL,
      deployer.address,
      tokenAdmin.address,
      dealAdmin.address,
      URI_PREFIX,
      URI_SUFFIX,
    ];
    console.log(
      'Deploying VentureClubUpgradable with initialize args:',
      deployArgs
    );
    ventureClubUpgradable = await upgrades.deployProxy(
      VentureClubUpgradable,
      deployArgs,
      { initializer: 'initialize' }
    );
    await ventureClubUpgradable.waitForDeployment();
    console.log(
      'VentureClubUpgradable deployed to:',
      await ventureClubUpgradable.getAddress()
    );
    console.log('Add it to the .env file');
    console.log(
      `${NFT_ADDRESS_NAME}=${await ventureClubUpgradable.getAddress()}`
    );
    console.log();
    console.log('waiting 6 blocks before verifying');
    await ventureClubUpgradable.deploymentTransaction().wait(6);
  } else {
    ventureClubUpgradable = await ethers.getContractAt(
      'VentureClubUpgradeable',
      NFT_ADDRESS,
    );
    console.log('Using VentureClubUpgradable already deployed to:', NFT_ADDRESS);
  }

  // if network is localhost or hardhat, exit, we're done, no need to verify
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    return;
  }

  await hre.run('verify:verify', {
    address: await ventureClubUpgradable.getAddress(),
    constructorArguments: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
