/* global require module process */
require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');

require('dotenv').config();

const pks = process.env.PRIVATE_KEYS.split(',') || [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',

  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: pks,
    },
    goerli: {
      url: process.env.GOERLI_RPC_URL,
      accounts: pks,
    },
    optimism: {
      url: process.env.OPT_RPC_URL,
      accounts: pks,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
