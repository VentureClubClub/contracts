/* global require, process */

const { ethers, run } = require('hardhat');

async function main() {
  const TestToken = await ethers.getContractFactory("TestToken");
  const testToken = await TestToken.deploy();
  await testToken.waitForDeployment();

  console.log("TestToken deployed to:", await testToken.getAddress());
  console.log("Waiting for 6 confirmations...");

  await testToken.deploymentTransaction().wait(6);
  await run("verify:verify", {
    address: await testToken.getAddress(),
    constructorArguments: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
