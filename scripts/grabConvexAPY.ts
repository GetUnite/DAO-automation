import { BigNumber } from "ethers";
import { ethers, network } from "hardhat"
import https from "https";
import fs from "fs";
import { ICurveCVXETH, ICurvePoolUSD, ICvxBaseRewardPool } from "../typechain";
import { reset } from "@nomicfoundation/hardhat-network-helpers";

type rewards = {
    tokenAddress: string,
    rewardPerToken: BigNumber
}

type returnsData = {
    poolName: string,
    curvePoolAddress: string,
    returnData: returns[]
}
type returns = {
    apr: number,
    timePeriod: number,
    rawReturnPercentage: number
}

type investmentData = {
    poolName: string,
    baseContractAddress: string,
    curvePoolAddress: string
}


export async function calculateReturns(numberOfDays: number, baseContractAddress: string, curvePoolAddress: string, index: number, secondCurvePoolAddress: string, secondIndex: number): Promise<number[]> {

    await reset(process.env.NODE_URL)
    let currentBlock = await ethers.provider.getBlockNumber()
    console.log("Current block")


    let lpUsdValueAfter = await calculateUSDValueOfLP(curvePoolAddress, index, secondCurvePoolAddress, secondIndex);
    let rewardPerTokensAfterArray = await getTokenRewardsAccumulated(baseContractAddress)
    await resetBlockBackDays(numberOfDays);

    let rewardPerTokensBeforeArray = await getTokenRewardsAccumulated(baseContractAddress)
    let lpUsdValueBefore = await calculateUSDValueOfLP(curvePoolAddress, index, secondCurvePoolAddress, secondIndex);

    await reset(process.env.NODE_URL, currentBlock)


    let rewardPerTokenDeltaArray: rewards[] = []
    for (let i = 0; i < rewardPerTokensBeforeArray.length; i++) {
        let rewardPerTokenBefore = rewardPerTokensBeforeArray[i].rewardPerToken
        let rewardPerTokenAfter = rewardPerTokensAfterArray[i].rewardPerToken
        let rewardPerTokenDelta = rewardPerTokenAfter.sub(rewardPerTokenBefore)
        let tokenAddress = rewardPerTokensBeforeArray[i].tokenAddress
        rewardPerTokenDeltaArray.push({ tokenAddress: tokenAddress, rewardPerToken: rewardPerTokenDelta })
    }

    let finalUSDValue = 0;

    // All CRV + extra token rewards first, calculate CVX in the middle
    for (let i = 0; i < rewardPerTokenDeltaArray.length; i++) {
        let tokenPrice = await getTokenPrice(rewardPerTokenDeltaArray[i].tokenAddress)
        let tokenAmount = Number(rewardPerTokenDeltaArray[i].rewardPerToken) / 1e18
        finalUSDValue += tokenPrice * Number(tokenAmount)

        if (rewardPerTokenDeltaArray[i].tokenAddress == "0xD533a949740bb3306d119CC777fa900bA034cd52") {
            let cvxAmount = await calculateCVXRewardsAccumulated(tokenAmount)
            let cvxPrice = await getTokenPrice("0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B")
            finalUSDValue += cvxPrice * cvxAmount
        }
    }
    let finalPercentageChange = (lpUsdValueAfter + finalUSDValue) / lpUsdValueBefore * 100 - 100;
    console.log("Initial Investment price", lpUsdValueBefore);
    console.log("Final Investment: Only LP", lpUsdValueAfter);
    console.log("Final rewards value", "$" + finalUSDValue)
    console.log("Final Investment total ", lpUsdValueAfter + finalUSDValue);
    console.log("Percentage change over", numberOfDays, "days=", finalPercentageChange + "%");

    //APR net of price change
    let apr = finalPercentageChange * 365 / numberOfDays;
    console.log(`APR: ${apr} over ${numberOfDays} days`);

    return [apr, finalPercentageChange]

}

async function getBaseCoin(curvePoolAddress: string, index: number, secondCurvePoolAddress: string, secondIndex: number): Promise<string> {
    let curvePoolContract = await ethers.getContractAt("contracts/curve/mainnet/ICurvePoolUSD.sol:ICurvePoolUSD", curvePoolAddress) as ICurvePoolUSD;
    let baseCoin = await curvePoolContract.coins(index);
    if (secondCurvePoolAddress !== "") {
        let secondCurvePoolContract = await ethers.getContractAt("contracts/curve/mainnet/ICurvePoolUSD.sol:ICurvePoolUSD", secondCurvePoolAddress) as ICurvePoolUSD;
        return await secondCurvePoolContract.coins(secondIndex);
    }
    return baseCoin
}

async function calculateUSDValueOfLP(curvePoolAddress: string, index: number, secondCurvePool: string, secondIndex: number): Promise<number> {
    if (secondCurvePool !== "") {
        return await calculateUSDValueOfLPComplex(curvePoolAddress, index, secondCurvePool, secondIndex)
    }
    let curvePoolContract = await ethers.getContractAt("contracts/curve/mainnet/ICurvePoolUSD.sol:ICurvePoolUSD", curvePoolAddress) as ICurvePoolUSD;
    let indexCoin = await curvePoolContract.coins(index);
    let oneLpToIndexCoin
    try {
        oneLpToIndexCoin = await curvePoolContract.calc_withdraw_one_coin(ethers.utils.parseEther("1"), index)

    }
    catch {
        let correctCurvePoolContract = await ethers.getContractAt("ICurveCVXETH", curvePoolAddress) as ICurveCVXETH;
        oneLpToIndexCoin = await correctCurvePoolContract.calc_withdraw_one_coin(ethers.utils.parseEther("1"), index)
    }
    let indexCoinPrice = await getTokenPrice(indexCoin)
    let indexCoinDecimals = await getTokenDecimals(indexCoin);
    let lpUSDValue = Number(ethers.utils.formatUnits(oneLpToIndexCoin, indexCoinDecimals)) * indexCoinPrice

    return lpUSDValue
}

async function calculateUSDValueOfLPComplex(curvePoolAddress: string, index: number, secondCurvePool: string, secondIndex: number): Promise<number> {
    let curvePoolContract = await ethers.getContractAt("contracts/curve/mainnet/ICurvePoolUSD.sol:ICurvePoolUSD", curvePoolAddress) as ICurvePoolUSD;
    let indexCoin = await curvePoolContract.coins(index);
    let oneLpToIndexCoin
    try {
        oneLpToIndexCoin = await curvePoolContract.calc_withdraw_one_coin(ethers.utils.parseEther("1"), index)

    }
    catch {
        let correctCurvePoolContract = await ethers.getContractAt("ICurveCVXETH", curvePoolAddress) as ICurveCVXETH;
        oneLpToIndexCoin = await correctCurvePoolContract.calc_withdraw_one_coin(ethers.utils.parseEther("1"), index)
    }


    let secondCurvePoolContract = await ethers.getContractAt("contracts/curve/mainnet/ICurvePoolUSD.sol:ICurvePoolUSD", secondCurvePool) as ICurvePoolUSD;
    let secondIndexCoin = await secondCurvePoolContract.coins(secondIndex);

    let quantityLpToSecondIndexCoin
    try {
        quantityLpToSecondIndexCoin = await secondCurvePoolContract.calc_withdraw_one_coin(oneLpToIndexCoin, secondIndex)
    }
    catch {
        let correctCurvePoolContract = await ethers.getContractAt("ICurveCVXETH", secondCurvePool) as ICurveCVXETH;
        quantityLpToSecondIndexCoin = await correctCurvePoolContract.calc_withdraw_one_coin(oneLpToIndexCoin, secondIndex)
    }

    let secondIndexCoinPrice = await getTokenPrice(secondIndexCoin)
    let secondIndexCoinDecimals = await getTokenDecimals(secondIndexCoin);
    let lpUSDValue = Number(ethers.utils.formatUnits(quantityLpToSecondIndexCoin, secondIndexCoinDecimals)) * secondIndexCoinPrice

    return lpUSDValue
}


async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        return 18;
    }
    let tokenContract = await ethers.getContractAt("IERC20Metadata", tokenAddress)
    let decimals = await tokenContract.decimals()
    return decimals
}
async function calculateCVXRewardsAccumulated(crvAmount: number): Promise<number> {
    let cvxContractAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
    let cvxContract = await ethers.getContractAt("IERC20Metadata", cvxContractAddress)
    let totalSupply = await cvxContract.totalSupply()
    let cvxAmount = crvAmount * (1 - Number(totalSupply) / 1e18 / 100000 / 1000)
    return cvxAmount
}
async function getTokenRewardsAccumulated(rewardContractAddress: string): Promise<rewards[]> {
    let rewards: rewards[] = []
    let rewardContract = await ethers.getContractAt("contracts/curve/mainnet/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", rewardContractAddress) as ICvxBaseRewardPool;
    let crvRewards = await rewardContract.rewardPerToken();
    let crvAddress = await rewardContract.rewardToken();
    let extraRewardsLength = Number(await rewardContract.extraRewardsLength());
    rewards.push({ tokenAddress: crvAddress, rewardPerToken: crvRewards })
    for (let i = 0; i < extraRewardsLength; i++) {
        let extraRewardContractAddress = await rewardContract.extraRewards(i);
        let extraRewardContract = await ethers.getContractAt("contracts/curve/mainnet/ICvxBaseRewardPool.sol:ICvxBaseRewardPool", extraRewardContractAddress) as ICvxBaseRewardPool;
        let extraRewardPerToken = await extraRewardContract.rewardPerToken();
        let extraRewardToken = await extraRewardContract.rewardToken();
        rewards.push({ tokenAddress: extraRewardToken, rewardPerToken: extraRewardPerToken })
    }

    return rewards
}

async function resetBlockBackDays(days: number): (Promise<void>) {
    let blockNumberNow = await ethers.provider.getBlockNumber()
    let blockNumberRequested = blockNumberNow - (days * 24 * 60 * 60 / 12)
    await reset(process.env.NODE_URL, blockNumberRequested)
}

async function getTokenPrice(tokenAddress: string): (Promise<number>) {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        tokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    }
    let url = "https://api.coingecko.com/api/v3/coins/ethereum/contract/" + tokenAddress;

    return new Promise((resolve) => {
        https.get(url, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk;
            });
            resp.on("end", () => {
                let price = JSON.parse(data).market_data.current_price.usd;
                resolve(price);
            });
        });
    })
}

