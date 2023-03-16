import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { gasPriceThreshold, getMaxBalance, getRandomSigner, isGasPriceGood } from "./ethers";
import { log, warning } from "./logging";
import { delay, getRandomOppositeTradePause } from "./timing";
import { randomInRange } from "./tools";
import { executeTrade, getAlluoForExactEth } from "./uniswap";

let alluoVolume = BigNumber.from(0);
let ethVolume = BigNumber.from(0);

async function getTradeVolume(doAlluo: boolean): Promise<BigNumber> {
    const max = (await getMaxBalance()).div("10000").toNumber();
    const min = max / 2;

    const ethValue = BigNumber.from(randomInRange(min, max)).mul("10000");

    if (doAlluo) {
        return ethValue;
    }
    else {
        // calculate ALLUO amount for `ethValue`
        return await getAlluoForExactEth(ethValue); 
    }
}

function doAlluoBuy(): boolean {
    // currently hardcoded to always do $ALLUO buy first
    return true;
    // return randomInRange(0, 1) == 1 ? true : false;
}

export async function tradingLoop() {
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

    while (!await isGasPriceGood()) {
        log("Gas price is not good (above " + gasPriceThreshold + " gwei), waiting 20s to check again...");
        await delay(20 * 1000);
    }
    log("Gas price is good (below " + gasPriceThreshold + " gwei), proceeding to trading...");

    log("First trade:")
    const amountReturned = await executeTrade(signerFirst, doAlluo, volume);
    if (doAlluo) {
        alluoVolume = alluoVolume.add(amountReturned);
    } else {
        ethVolume = ethVolume.add(amountReturned);
    }
    log("Total volume: " + formatEther(ethVolume) + " ETH, " + formatEther(alluoVolume) + " ALLUO");

    const pauseBeforeReverse = getRandomOppositeTradePause();
    log("Waiting for " + pauseBeforeReverse + " seconds before reverse trade...")
    await delay(pauseBeforeReverse * 1000);

    log("Reverse trade - finding someone else to execute reverse trade");
    let signerSecond = await getRandomSigner(amountReturned, !doAlluo);

    if (signerSecond == null) {
        signerSecond = signerFirst;
    }

    log("Using address " + signerSecond.address + " to " + (doAlluo ? "sell" : "buy") + " ALLUO, amount: " + formatEther(amountReturned) + (doAlluo ? " ALLUO" : " ETH"));

    const amountReturnedReverse = await executeTrade(signerSecond, !doAlluo, amountReturned);
    if (!doAlluo) {
        alluoVolume = alluoVolume.add(amountReturnedReverse);
    } else {
        ethVolume = ethVolume.add(amountReturnedReverse);
    }
    log("Total volume: " + formatEther(ethVolume) + " ETH, " + formatEther(alluoVolume) + " ALLUO");

    log("Reverse trade finished");
    log("Cycle completed successfully");
}
