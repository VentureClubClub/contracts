/* global require module process */
require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');

require('dotenv').config();

const stagingKeys = process.env.STAGING_PRIVATE_KEYS.split(',') || [];
const productionKeys = process.env.PRODUCTION_PRIVATE_KEYS.split(',') || [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',

  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: stagingKeys,
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL,
      accounts: [],
    },
    optimism: {
      url: process.env.OPT_RPC_URL,
      accounts: productionKeys,
    },
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: productionKeys,
    }
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      optimisticEthereum: process.env.OPT_ETHERSCAN_API_KEY,
      base: process.env.BASE_ETHERSCAN_API_KEY,
    },
  },
};

