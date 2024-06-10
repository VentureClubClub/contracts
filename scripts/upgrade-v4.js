/* global require, process, console */

const hre = require('hardhat');

const { ethers, upgrades } = hre;

var nftAddress;
switch (hre.network.name) {
case 'mainnet':
  nftAddress = process.env.MAINNET_NFT_ADDRESS;
  break;
case 'optimism':
  nftAddress = process.env.OPT_NFT_ADDRESS;
  break;
case 'base':
  nftAddress = process.env.BASE_NFT_ADDRESS;
  break;
case 'goerli':
  nftAddress = process.env.GOERLI_NFT_ADDRESS;
  break;
case 'sepolia':
  nftAddress = process.env.SEPOLIA_NFT_ADDRESS;
  break;
case 'hardhat':
  nftAddress = process.env.HARDHAT_NFT_ADDRESS;
  break;
case 'localhost':
  nftAddress = process.env.LOCALHOST_NFT_ADDRESS;
  break;
default:
  throw new Error('Unsupported network. Add', hre.network.name, "to upgrade-v3.js");
}

if (!nftAddress) {
  console.log('ERROR: NFT address not set for network ' + hre.network.name);
  console.log('Run the deploy script for the NFT contract first');
  process.exit(1);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const V4 = await ethers.getContractFactory('VentureClubUpgradeable_v4');
  console.log(`Upgrading VentureClub ${nftAddress} to v4...`);
  const v4 = await upgrades.upgradeProxy(nftAddress, V4);
  await v4.waitForDeployment();
  console.log('upgraded to VentureClubUpgradable_v4 at', await v4.getAddress());

  // if network is localhost or hardhat, exit, we're done, no need to verify
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    return;
  }

  await hre.run('verify:verify', {
    address: await v4.getAddress(),
    constructorArguments: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
