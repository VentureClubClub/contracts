/* global require, process */

const { abi } = require('../artifacts/contracts/TestERC20.sol/TestToken.json')
const { ethers, run } = require('hardhat');
const hre = require('hardhat');
const { Contract } = ethers;

async function main() {
  const testToken = new Contract("0x63a14F8975261d6754595C0883b9044f0d383556")
  await testToken.mint()
  await testToken.mint()
  await testToken.mint()

  await testToken.transfer("0x4DAAc1943c42B5988629414af1c32936601E81ea")
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
