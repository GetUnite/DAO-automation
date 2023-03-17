import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { alluo, signers } from "./bot";
import { getPrepand, log, setPrepand, warning } from "./logging";
import { randomInRange, shuffle } from "./tools";

export const gasPriceThreshold = 20; // gwei

export async function isGasPriceGood(): Promise<boolean> {
    const currentGasPrice = await ethers.provider.getGasPrice();
    log("Current gas price is " + formatUnits(currentGasPrice, 9) + " gwei");

    return currentGasPrice.lte(parseUnits(gasPriceThreshold.toString(), 9));
}

export async function getMaxBalance(): Promise<BigNumber> {
    let max: BigNumber = BigNumber.from("0");
    for (let i = 1; i < signers.length; i++) {
        const signer = signers[i];
        const balance = await signer.getBalance();

        if (max.lt(balance)) {
            max = balance;
        }
    }

    log(`Max owned balance is ${formatEther(max)} ETH`);
    return max;
}

export async function getRandomSigner(minBalance: BigNumberish, buyAlluo: boolean): Promise<SignerWithAddress | null> {
    const asset = buyAlluo ? "ETH" : "ALLUO";
    const minBalanceAdjusted = (minBalance as BigNumber).add(parseEther("0.004"));
    log("Trying to find any address with balance at least " + formatEther(minBalanceAdjusted) + " " + asset);
    let indexes = shuffle([...Array(signers.length - 1).keys()])

    const prepandBefore = getPrepand();
    setPrepand(prepandBefore + "    ");
    try {
        for (let i = 0; i < indexes.length; i++) {
            const index = indexes[i] + 1;
            const signer = signers[index];
            const balance = buyAlluo ?
                await signer.getBalance():
                await alluo.callStatic.balanceOf(signer.address);
            if (balance.gte(minBalanceAdjusted)) {
                log("Address " + signer.address + " at index " + index + " has enough balance (" + formatEther(balance) + " " + asset + ")");
                setPrepand(prepandBefore);
                return signer;
            }
            else {
                warning("Address " + signer.address + " at index " + index + " has NOT enough balance (" + formatEther(balance) + " " + asset + ")");
            }
        }
        setPrepand(prepandBefore);
        warning("Can't find address with balance of at least " + formatEther(minBalanceAdjusted) + " " + asset);
        return null;
    } catch (err) {
        setPrepand(prepandBefore);
        throw err;
    }
}
