import { ethers } from "hardhat"
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";
import { ibAlluoInfoPromise, ibAlluosInfo } from "./createProposals";
import { settings } from "./settings";
import { getTokenPrice } from "./coingeckoApi";

// There is no way to avoid rate limit from coingecko on requests from cloud IP addresses. Function execution might take long time,
// because we always retry on rate limit. Would be better to use a different pricing API, execute requests through
// private proxy, or get API key from coingecko
//
// Function execution took 2.618s from private IP address
// In case when first request is rate limited, execution took 2:03.702 (m:ss.mmm)
export async function calculateTotalBalances(): Promise<number> {
    const mainnetSafe = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    const polygonSafe = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
    const voteExecutorMaster = "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89";

    let [mainnetTotalBalanceInUSD, uniswapPositionGnosis, polygonTotalBalanceInUSD] = await Promise.all([
        checkMainnetBalances(settings.tokensToCheckMainnet, [mainnetSafe, voteExecutorMaster]),
        getUniV3Position(),
        checkPolygonBalances(settings.tokensToCheckPolygon, polygonSafe)
    ]);

    console.log("Mainnet total balnace in USD: ", mainnetTotalBalanceInUSD)
    console.log("Polygon total balnace in USD: ", polygonTotalBalanceInUSD)

    return mainnetTotalBalanceInUSD + uniswapPositionGnosis + polygonTotalBalanceInUSD
}

export async function calculateUserFunds(): Promise<number> {
    const polygonProvider = new ethers.providers.JsonRpcProvider(settings.polygonUrl);
    await reset()
    await ibAlluoInfoPromise;
    let iballuoAddresses = ibAlluosInfo.map((iballuoInfo) => iballuoInfo.ibAlluoAddress);
    let finalValue = 0;
    const actions = [];

    for (let iballuoAddress of iballuoAddresses) {
        const action = async () => {
            let iballuo = (await ethers.getContractAt("IIbAlluo", iballuoAddress)).connect(polygonProvider);
            // Parralel requests
            let totalValueLocked = await iballuo.totalAssetSupply();
            let gnosisBalance = await iballuo.balanceOf("0x2580f9954529853ca5ac5543ce39e9b5b1145135");
            let superToken = await iballuo.superToken();
            let streamableTokenPromise = ethers.getContractAt("IStIbAlluo", superToken);
            let primaryTokensPromise = iballuo.getListSupportedTokens();
            let ibAlluoNamePromise = iballuo.name();

            let primaryToken = (await primaryTokensPromise)[0];
            let primaryTokenPrice = await getTokenPrice(primaryToken, "polygon-pos");

            const streamableToken = (await streamableTokenPromise).connect(polygonProvider);
            let gnosisBalanceStreamable = await streamableToken.realtimeBalanceOfNow("0x2580f9954529853ca5ac5543ce39e9b5b1145135");
            let valueHeldByGnosis = await iballuo.convertToAssetValue(gnosisBalance);

            let gnosisValueStreamable = await iballuo.convertToAssetValue(gnosisBalanceStreamable.availableBalance);
            let stiballuoDoubleCount = await iballuo.convertToAssetValue(await iballuo.balanceOf(streamableToken.address))
            let totalIbAlluoCustomerFunds = Number(totalValueLocked) - Number(valueHeldByGnosis) - Number(stiballuoDoubleCount)
            console.log("total iballuo customer funds", (totalIbAlluoCustomerFunds))
            let stiballuoTVL = await streamableToken.totalSupply();
            let totalStIbAlluoCustomerFunds = Number(await iballuo.convertToAssetValue(stiballuoTVL)) - Number(gnosisValueStreamable);
            console.log("total stiballuo customer funds", (totalStIbAlluoCustomerFunds));
            let totalAssetCustomerFunds = totalIbAlluoCustomerFunds + totalStIbAlluoCustomerFunds;
            console.log("IbAlluo:", await ibAlluoNamePromise, "Total asset customer funds:", totalAssetCustomerFunds / (10 ** 18));
            finalValue += primaryTokenPrice * totalAssetCustomerFunds / (10 ** 18);
        };
        actions.push(action());
    }
    await Promise.all(actions);
    return finalValue;
}

export async function calculateBoosterFunds(address: string): Promise<number> {
    // Because the calculations involve exchange contract, we need to use forked hardhat network
    // Now boosted funds are empty.
    return 0;
    await reset(settings.mainnetUrl)
    let boostersToCheck = ["0x1EE566Fd6918101C578a1d2365d632ED39BEd740", "0xcB9e36cD1A0eD9c98Db76d1619e649A7a032F271"]
    let finalValue = 0;
    let impersonatedAddress = await ethers.getSigner(address);
    const actions = [];

    for (let boosterAddress of boostersToCheck) {
        const action = async () => {
            let booster = await ethers.getContractAt("IAlluoVaultUpgradeable", boosterAddress);
            let balance = await booster.balanceOf(address);
            let usdcBalancePromise = booster.connect(impersonatedAddress).callStatic.withdrawToNonLp(balance, address, address, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
            let usdcPrice = getTokenPrice("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "ethereum")

            let usdcBalance = await usdcBalancePromise;
            console.log("USDC balance if withdrawn", Number(usdcBalance) / (10 ** 6));
            finalValue += await usdcPrice * Number(usdcBalance) / (10 ** 6);
        };
        actions.push(action());
    }

    await Promise.all(actions);
    console.log("Total booster funds:", finalValue);
    return finalValue;
}
export async function checkMainnetBalances(tokenArray: string[], accounts: string[]): Promise<number> {
    const mainnetProvider = new ethers.providers.JsonRpcProvider(settings.mainnetUrl);
    const actions = [];
    let totalBalance = 0
    for (let tokenAddress of tokenArray) {
        const action = async () => {
            let tokenContract = (await ethers.getContractAt("IERC20Metadata", tokenAddress)).connect(mainnetProvider)
            // let balancePromise = tokenContract.balanceOf(account);
            let accountsBalances = Promise.all(accounts.map(account => tokenContract.balanceOf(account)));
            let decimalsPromise = getTokenDecimals(tokenAddress, mainnetProvider)
            let pricePromise = getTokenPrice(tokenAddress, "ethereum");

            let accountsBalancesSum = BigNumber.from(0);
            for (let accountBalance of await accountsBalances) {
                accountsBalancesSum = accountsBalancesSum.add(accountBalance)
            }

            let balanceInUsd = Number(accountsBalancesSum) / (10 ** await decimalsPromise) * await pricePromise
            totalBalance += balanceInUsd
        }
        actions.push(action());
    }

    await Promise.all(actions);
    return totalBalance
}

export async function checkPolygonBalances(tokenArray: string[], account: string): Promise<number> {
    let totalBalance = 0
    const actions = [];
    const polygonProvider = new ethers.providers.JsonRpcProvider(settings.polygonUrl);
    for (let tokenAddress of tokenArray) {
        const action = async () => {
            let tokenContract = (await ethers.getContractAt("IERC20Metadata", tokenAddress)).connect(polygonProvider)
            let balancePromise = tokenContract.balanceOf(account)
            let decimalsPromise = getTokenDecimals(tokenAddress, polygonProvider)
            let pricePromise = getTokenPrice(tokenAddress, "polygon-pos");

            let balanceInUsd = Number(await balancePromise) / (10 ** await decimalsPromise) * await pricePromise
            totalBalance += balanceInUsd
        }
        actions.push(action());
    }

    await Promise.all(actions);
    return totalBalance
}

async function getTokenDecimals(tokenAddress: string, provider: any): Promise<number> {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        return 18;
    }
    let tokenContract = (await ethers.getContractAt("IERC20Metadata", tokenAddress)).connect(provider)
    let decimals = await tokenContract.decimals()
    return decimals
}


let alluoUniswapV3Pool = "0x4e44c9abc0b7c61e5f9e165271581d823abf684d"


export async function getUniV3Position(): Promise<number> {
    // Call RPC instead of using slow hardhat forked network
    const provider = new ethers.providers.JsonRpcProvider(settings.mainnetUrl);

    let nftPositionManager: any = ethers.getContractAt("INonfungiblePositionManager", "0xC36442b4a4522E871399CD717aBDD847Ab11FE88");
    let uniswapv3Pool: any = ethers.getContractAt("IUniswapV3Pool", alluoUniswapV3Pool);


    // View functions calls
    nftPositionManager = (await nftPositionManager).connect(provider);
    let position: any = nftPositionManager.positions(343227)
    uniswapv3Pool = (await uniswapv3Pool).connect(provider);
    let token1: any = uniswapv3Pool.token1();
    let slot0: any = uniswapv3Pool.slot0();
    let feesGenerated: any = calculatePendingFees(343227, "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3", BigNumber.from(2).pow(128).sub(1), BigNumber.from(2).pow(128).sub(1), provider)

    // alluo/eth
    position = await position;
    let priceLower = (1.0001 ** position.tickLower)
    slot0 = await slot0;
    let priceNow = 1.0001 ** (slot0.tick)

    let amount1 = calcAmount1(Number(position.liquidity), priceNow, priceLower, 18, 18) // amount of eth
    // Disregard alluo balance
    // value of eth position in usd
    feesGenerated = await feesGenerated;
    console.log("Fees generated", feesGenerated);
    if (typeof feesGenerated !== "undefined") {
        amount1 += Number(feesGenerated.amount1)
    }
    let valueOfAmount1 = (amount1) * await getTokenPrice(await token1, "ethereum") / 10 ** 18
    console.log("Value of alluo uniswap position in usd", valueOfAmount1)
    return valueOfAmount1
}

export const calculatePendingFees = async (
    tokenId: number,
    recipient: string,
    amount0Max: BigNumber,
    amount1Max: BigNumber,
    provider: any
) => {
    try {
        const params = {
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: amount0Max,
            amount1Max: amount1Max,
        }

        let nftPositionManager = await ethers.getContractAt("INonfungiblePositionManager", "0xC36442b4a4522E871399CD717aBDD847Ab11FE88")
        const feesGenerated = await nftPositionManager.connect(provider).callStatic.collect(params, { from: recipient });

        return feesGenerated;
    } catch (error: any) {
        console.log(error.message, "calculate fees error")
    }
}

const calcAmount1 = (
    liquidity: number,
    currentPrice: number,
    priceLower: number,
    token0Decimals: number,
    token1Decimals: number
) => {
    const decimalAdjustment = 10 ** (token0Decimals - token1Decimals)
    const mathCurrentPrice = currentPrice / decimalAdjustment
    const mathPriceLower = priceLower / decimalAdjustment

    const math =
        liquidity * (Math.sqrt(mathCurrentPrice) - Math.sqrt(mathPriceLower))
    const adjustedMath = math > 0 ? math : 0
    return adjustedMath
}

