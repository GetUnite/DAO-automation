import { ethers } from "hardhat"
import https from "https";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";
import { tickToPrice } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


let tokensToCheckMainnet = [
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    "0xd533a949740bb3306d119cc777fa900ba034cd52", // CRV
    "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b", // CVX
    "0x5a98fcbea516cf06857215779fd812ca3bef1b32", // LDO
    "0x31429d1856ad1377a8a0079410b297e1a9e214c2", // ANGLE
    "0x090185f2135308bad17527004364ebcc2d37e5f6", // SPELL
    "0xc581b735a1688071a1746c968e0798d642ede491", // EURT,
    "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c" // EUROC
]

let tokensToCheckPolygon = [
    "0xe0b52e49357fd4daf2c15e02058dce6bc0057db4", // agEUR
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH
    "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC
    "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f", // EURT
]

export async function calculateTotalBalances(accounts: string[]): Promise<number> {
    let mainnetTotalBalanceInUSD = await checkMainnetBalances(tokensToCheckMainnet, accounts[0])
    let polygonTotalBalanceInUSD = await checkPolygonBalances(tokensToCheckPolygon, accounts[1])
    console.log("Mainnet total balnace in USD: ", mainnetTotalBalanceInUSD)
    console.log("Polygon total balnace in USD: ", polygonTotalBalanceInUSD)
    await reset(process.env.NODE_URL)
    return mainnetTotalBalanceInUSD + polygonTotalBalanceInUSD
}

export async function calculateUserFunds(): Promise<number> {
    await reset(process.env.POLYGON_URL)

    let liquidityHandler = await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1")
    let iballuoAddresses = await liquidityHandler.getListOfIbAlluos();
    let finalValue = 0;
    for (let iballuoAddress of iballuoAddresses) {
        let iballuo = await ethers.getContractAt("IIbAlluo", iballuoAddress);
        let primaryToken = (await iballuo.getListSupportedTokens())[0]
        let primaryTokenPrice = await getTokenPrice(primaryToken, "polygon-pos")

        let totalValueLocked = await iballuo.totalAssetSupply();

        let gnosisBalance = await iballuo.balanceOf("0x2580f9954529853ca5ac5543ce39e9b5b1145135");
        let valueHeldByGnosis = await iballuo.convertToAssetValue(gnosisBalance);

        let superToken = await iballuo.superToken();

        let streamableToken = await ethers.getContractAt("IStIbAlluo", superToken);
        let gnosisBalanceStreamable = await streamableToken.realtimeBalanceOfNow("0x2580f9954529853ca5ac5543ce39e9b5b1145135");
        let gnosisValueStreamable = await iballuo.convertToAssetValue(gnosisBalanceStreamable.availableBalance);

        let totalAssetCustomerFunds = Number(totalValueLocked) - Number(valueHeldByGnosis) + Number(gnosisValueStreamable);
        console.log("IbAlluo:", await iballuo.name(), "Total asset customer funds:", totalAssetCustomerFunds / (10 ** 18));
        finalValue += primaryTokenPrice * totalAssetCustomerFunds / (10 ** 18);
    }
    return finalValue;
}

export async function calculateBoosterFunds(address: string): Promise<number> {
    await reset(process.env.NODE_URL)
    let boostersToCheck = ["0x1EE566Fd6918101C578a1d2365d632ED39BEd740", "0xcB9e36cD1A0eD9c98Db76d1619e649A7a032F271"]
    let finalValue = 0;
    let impersonatedAddress = await ethers.getSigner(address);

    for (let boosterAddress of boostersToCheck) {
        let booster = await ethers.getContractAt("IAlluoVaultUpgradeable", boosterAddress);
        let balance = await booster.balanceOf(address);
        let usdcBalance = await booster.connect(impersonatedAddress).callStatic.withdrawToNonLp(balance, address, address, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
        console.log("USDC balance if withdrawn", Number(usdcBalance) / (10 ** 6));
        let usdcPrice = await getTokenPrice("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", "ethereum")
        finalValue += usdcPrice * Number(usdcBalance) / (10 ** 6);
    }
    console.log(finalValue)
    return finalValue;
}
async function checkMainnetBalances(tokenArray: string[], account: string): Promise<number> {
    await reset(process.env.NODE_URL)
    let totalBalance = 0
    for (let tokenAddress of tokenArray) {
        let tokenContract = await ethers.getContractAt("IERC20Metadata", tokenAddress)
        let balance = await tokenContract.balanceOf(account)
        let decimals = await getTokenDecimals(tokenAddress)
        let price = await getTokenPrice(tokenAddress, "ethereum")
        let balanceInUsd = Number(balance) / (10 ** decimals) * price
        totalBalance += balanceInUsd
    }
    totalBalance += await getUniV3Position()
    return totalBalance
}

async function checkPolygonBalances(tokenArray: string[], account: string): Promise<number> {
    await reset(process.env.POLYGON_URL)
    let totalBalance = 0
    for (let tokenAddress of tokenArray) {
        let tokenContract = await ethers.getContractAt("IERC20Metadata", tokenAddress)
        let balance = await tokenContract.balanceOf(account)
        let decimals = await getTokenDecimals(tokenAddress)
        let price;
        if (tokenAddress == "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f") {
            // Coingecko doesn't have polygon price for EURT
            price = await getTokenPrice("0xc581b735a1688071a1746c968e0798d642ede491", "ethereum")
        } else {
            price = await getTokenPrice(tokenAddress, "polygon-pos")
        }
        let balanceInUsd = Number(balance) / (10 ** decimals) * price
        totalBalance += balanceInUsd
    }
    return totalBalance
}

async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        return 18;
    }
    let tokenContract = await ethers.getContractAt("IERC20Metadata", tokenAddress)
    let decimals = await tokenContract.decimals()
    return decimals
}

async function resetBlockBackDays(days: number): (Promise<void>) {
    let blockNumberNow = await ethers.provider.getBlockNumber()
    let blockNumberRequested = blockNumberNow - (days * 24 * 60 * 60 / 12)
    await reset(process.env.NODE_URL, blockNumberRequested)
}

async function getTokenPrice(tokenAddress: string, network: string): (Promise<number>) {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        tokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    }
    console.log("Getting", tokenAddress)

    //Keep getting rate limited by coingecko randomly...
    await delay(7000)
    let url = `https://api.coingecko.com/api/v3/coins/${network}/contract/${tokenAddress}`;
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
const delay = (delayInms: number) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
}

let nftsToCheck = [
    343227
]

let alluoUniswapV3Pool = "0x4e44c9abc0b7c61e5f9e165271581d823abf684d"


async function getUniV3Position(): Promise<number> {
    await reset(process.env.NODE_URL)
    let nftPositionManager = await ethers.getContractAt("INonfungiblePositionManager", "0xC36442b4a4522E871399CD717aBDD847Ab11FE88")
    let uniswapv3Pool = await ethers.getContractAt("IUniswapV3Pool", alluoUniswapV3Pool)
    let position = await nftPositionManager.positions(343227)
    let token0 = new Token(1, await uniswapv3Pool.token0(), 18)
    let token1 = new Token(1, await uniswapv3Pool.token1(), 18)

    // alluo/ eth
    let priceLower = (1.0001 ** (position.tickLower))
    let priceUpper = (1.0001 ** (position.tickUpper))
    let priceNow = 1.0001 ** ((await uniswapv3Pool.slot0()).tick)

    let feesGenerated = await calculatePendingFees(343227, "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3", BigNumber.from(2).pow(128).sub(1), BigNumber.from(2).pow(128).sub(1), 1)
    console.log("Fees generated", feesGenerated);
    let amount0 = calcAmount0(Number(position.liquidity), priceNow, priceUpper, 18, 18) // amount of alluo
    let amount1 = calcAmount1(Number(position.liquidity), priceNow, priceLower, 18, 18) // amount of eth
    // Disregard alluo balance
    // value of eth position in usd
    if (typeof feesGenerated !== "undefined") {
        amount1 += Number(feesGenerated.amount1)
    }
    let valueOfAmount1 = (amount1) * await getTokenPrice(token1.address, "ethereum") / 10 ** 18
    console.log("Value of alluo uniswap position in usd", valueOfAmount1)
    return valueOfAmount1
}

const calculatePendingFees = async (
    tokenId: number,
    recipient: string,
    amount0Max: BigNumber,
    amount1Max: BigNumber,
    chainId: number
) => {
    try {
        const params = {
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: amount0Max,
            amount1Max: amount1Max,
        }

        let nftPositionManager = await ethers.getContractAt("INonfungiblePositionManager", "0xC36442b4a4522E871399CD717aBDD847Ab11FE88")
        let recipientImp = await ethers.getSigner(recipient);
        const feesGenerated = await nftPositionManager.connect(recipientImp).callStatic.collect(params)
        return feesGenerated
    } catch (error: any) {
        console.log(error.message, "calculate fees error")
    }
}
const calcAmount0 = (
    liquidity: number,
    currentPrice: number,
    priceUpper: number,
    token0Decimals: number,
    token1Decimals: number
) => {
    const decimalAdjustment = 10 ** (token0Decimals - token1Decimals)
    const mathCurrentPrice = currentPrice / decimalAdjustment
    const mathPriceUpper = priceUpper / decimalAdjustment

    const math =
        liquidity *
        ((Math.sqrt(mathPriceUpper) - Math.sqrt(mathCurrentPrice)) /
            (Math.sqrt(mathCurrentPrice) * Math.sqrt(mathPriceUpper)))
    const adjustedMath = math > 0 ? math : 0
    return adjustedMath
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
