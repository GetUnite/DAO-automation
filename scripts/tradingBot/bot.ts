import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { IERC20Metadata } from "../../typechain/IERC20Metadata";
import { isGasPriceGood } from "./ethers";
import { error, log, setPrepand } from "./logging";
import { delay, getRandomExecutionPause } from "./timing";
import { tradingLoop as tradingCycle } from "./trading";
import { executeTrade } from "./uniswap";

export let signers: SignerWithAddress[];
export let alluo: IERC20Metadata;

async function init() {
    signers = await ethers.getSigners();
    alluo = await ethers.getContractAt("IERC20Metadata", "0x1e5193ccc53f25638aa22a940af899b692e10b09");
    log("Fetched " + signers.length + " signers from mnemonic.");

    const network = await ethers.provider.getNetwork();
    log("Connected to network with chainId: " + network.chainId);

    if (network.chainId == 31337) {
        log("Hardhat network detected, setting custom balance and buying ALLUO for everyone...");
        await isGasPriceGood();
        for (let i = 0; i < signers.length; i++) {
            const signer = signers[i];

            await ethers.provider.send("hardhat_setBalance", [
                signer.address,
                "0x429d069189e0000",
              ]);
            
            await executeTrade(signer, true, parseEther("0.15"));
        }
    }
}

async function main() {
    await init();

    while (true) {
        console.log();
        log("Next cycle:");
        setPrepand("    ");

        try {
            await tradingCycle();
        } catch (err) {
            error("Error in trading cycle");
            console.log("\n", err, "\n");
            error("Skipping this cycle because of error");
        }

        setPrepand("");

        const interval = getRandomExecutionPause();
        log("Waiting for " + interval + " seconds before next cycle");
        await delay(interval * 1000);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});