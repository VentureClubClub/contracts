/* global require, process, console */

const hre = require('hardhat');

const { ethers, upgrades } = hre;

var nftAddress;
switch (hre.network.name) {
case 'mainnet':
  nftAddress = process.env.MAINNET_NFT_ADDRESS;
  break;
case 'goerli':
  nftAddress = process.env.GOERLI_NFT_ADDRESS;
  break;
case 'sepolia':
  nftAddress = process.env.SEPOLIA_NFT_ADDRESS;
  break;
case 'optimism':
    nftAddress = process.env.OPT_NFT_ADDRESS;
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
  const V3 = await ethers.getContractFactory('VentureClubUpgradeable_v3');
  console.log(`Upgrading VentureClub ${nftAddress} to v3...`);
  const v3 = await upgrades.upgradeProxy(nftAddress, V3);
  await v3.waitForDeployment();
  console.log('upgraded to VentureClubUpgradable_v3 at', await v3.getAddress());

  // deploy non upgradable contracts
  const Data = await ethers.getContractFactory('VCData');
  const dataArgs = [
    await deployer.getAddress(),
    await deployer.getAddress(),
    await deployer.getAddress(),
  ];
  const data = await Data.deploy(...dataArgs);
  await data.waitForDeployment();
  console.log('VCData deployed at', await data.getAddress());

  const Compliance = await ethers.getContractFactory('VCCompliance');
  const compliance = await Compliance.deploy(await data.getAddress());
  await compliance.waitForDeployment();
  console.log('VCCompliance deployed at', await compliance.getAddress());

  await v3.setCompliance(await compliance.getAddress());

  console.log("waiting for 6 blocks")
  await data.deploymentTransaction().wait(6);
  await compliance.deploymentTransaction().wait(6);

  // if network is localhost or hardhat, exit, we're done, no need to verify
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    return;
  }

  await hre.run('verify:verify', {
    address: await v3.getAddress(),
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: await data.getAddress(),
    constructorArguments: dataArgs,
  });
  await hre.run('verify:verify', {
    address: await compliance.getAddress(),
    constructorArguments: [await data.getAddress()],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
