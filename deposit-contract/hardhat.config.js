require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
const secrets = require("./.env.sepolia.js");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: secrets.ALCHEMY_SEPOLIA_API_URL,
      accounts: [secrets.SEPOLIA_DEPLOY_PK],
    }
  },
  etherscan: {
    apiKey: secrets.ETHERSCAN_API_KEY,
  }
};
