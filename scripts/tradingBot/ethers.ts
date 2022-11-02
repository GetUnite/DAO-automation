import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";
import { formatEther, formatUnits, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { alluo, signers } from "./bot";
import { getPrepand, log, setPrepand, warning } from "./logging";
import { randomInRange, shuffle } from "./tools";

export const gasPriceThreshold = 100; // gwei

export async function isGasPriceGood(): Promise<boolean> {
    const currentGasPrice = await ethers.provider.getGasPrice();
    log("Current gas price is " + formatUnits(currentGasPrice, 9) + " gwei");

    return currentGasPrice.lte(parseUnits(gasPriceThreshold.toString(), 9));
}

export async function getRandomSigner(minBalance: BigNumberish, buyAlluo: boolean): Promise<SignerWithAddress | null> {
    const asset = buyAlluo ? "ETH" : "ALLUO";
    log("Trying to find any address with balance at least " + formatEther(minBalance) + " " + asset);
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
            if (balance.gte(minBalance)) {
                log("Address " + signer.address + " has enough balance (" + formatEther(balance) + " " + asset + ")");
                setPrepand(prepandBefore);
                return signer;
            }
            else {
                warning("Address " + signer.address + " at index " + index + " has NOT enough balance (" + formatEther(balance) + " " + asset + ")");
            }
        }
        setPrepand(prepandBefore);
        warning("Can't find address with balance of at least " + formatEther(minBalance) + " " + asset);
        return null;
    } catch (err) {
        setPrepand(prepandBefore);
        throw err;
    }
}