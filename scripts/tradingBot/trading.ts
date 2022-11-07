import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { gasPriceThreshold, getRandomSigner, isGasPriceGood } from "./ethers";
import { log, warning } from "./logging";
import { delay, getRandomOppositeTradePause } from "./timing";
import { randomInRange } from "./tools";
import { executeTrade, getAlluoForExactEth } from "./uniswap";

async function getTradeVolume(doAlluo: boolean): Promise<BigNumber> {
    const min = 50000000; // 0.050000000000000000
    const max = 1000000000; // 1.000000000000000000

    const ethValue = BigNumber.from(randomInRange(min, max)).mul("1000000000");

    if (doAlluo) {
        return ethValue;
    }
    else {
        // calculate ALLUO amount for `ethValue`
        return await getAlluoForExactEth(ethValue); 
    }
}

function doAlluoBuy(): boolean {
    // 50-50 chance to buy or sell ALLUO first
    return randomInRange(0, 1) == 1 ? true : false;
}

export async function tradingLoop() {
    if (!await isGasPriceGood()) {
        log("Gas price is not good (below " + gasPriceThreshold + " gwei), skipping cycle...");
        return;
    }

    log("Gas price is good (above " + gasPriceThreshold + " gwei), proceeding to trading...");

    let doAlluo = doAlluoBuy();
    let volume = await getTradeVolume(doAlluo);
    log("Coin toss: " + (doAlluo ? "buying" : "selling") + " ALLUO first, amount: " + formatEther(volume) + (doAlluo ? " ETH" : " ALLUO"));

    let signerFirst = await getRandomSigner(volume, doAlluo);
    while (signerFirst == null) {
        doAlluo = doAlluoBuy();
        volume = await getTradeVolume(doAlluo);
    
        warning("Coin toss again: " + (doAlluo ? "buying" : "selling") + " ALLUO first, amount: " + formatEther(volume) + (doAlluo ? " ETH" : " ALLUO"));

        signerFirst = await getRandomSigner(volume, doAlluo);
    }

    log("Using address " + signerFirst.address + " to " + (doAlluo ? "buy" : "sell") + " ALLUO, amount: " + formatEther(volume) + (doAlluo ? " ETH" : " ALLUO"));

    log("First trade:")
    const amountReturned = await executeTrade(signerFirst, doAlluo, volume);

    const pauseBeforeReverse = getRandomOppositeTradePause();
    log("Waiting for " + pauseBeforeReverse + " seconds before reverse trade...")
    await delay(pauseBeforeReverse * 1000);

    log("Reverse trade - finding someone else to execute reverse trade");
    let signerSecond = await getRandomSigner(amountReturned, !doAlluo);

    if (signerSecond == null) {
        signerSecond = signerFirst;
    }

    log("Using address " + signerSecond.address + "to " + (doAlluo ? "sell" : "buy") + " ALLUO, amount: " + formatEther(amountReturned) + (doAlluo ? " ALLUO" : " ETH"));

    const amountReturnedReverse = await executeTrade(signerFirst, !doAlluo, amountReturned);
    log("Reverse trade finished");
    log("Cycle completed successfully");
}