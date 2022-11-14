import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.11",
  defaultNetwork: "polygon",
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.MAINNET_URL || ""
      },
      accounts: {
        count: 11
      }
    },
    polygon: {
      url: process.env.POLYGON_URL || "http://127.0.0.1/",
      accounts: {
        mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk"
      }
    },
    node: {
      url: process.env.NODE_URL || "https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", // found on google
      accounts: {
        mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk"
      }
    },
    mainnet: {
      url: process.env.MAINNET_URL,
      accounts: {
        mnemonic: process.env.MNEMONIC,
        count: 11
      }
    },
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: {
        mnemonic: process.env.MNEMONIC,
        count: 5
      }
    }
  }
};

export default config;
