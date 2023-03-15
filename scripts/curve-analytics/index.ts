import { BigNumber, constants, Contract, ethers, providers } from "ethers";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { JWT } from "google-auth-library";
import { google } from "googleapis";

let auth: JWT;
let providerMainnet: providers.JsonRpcProvider;
let sheetId: string;

type AssetInfo = {
    ratio: string,
    name: string,
    contract: string,
}

type LiquidityDirectionInfo = {
    poolName: string,
    poolContract: string,
    poolType: string,
    coreAsset: string,
    lpTotalSupply: string,
    oneLpToCoreAsset: string,
    pct1LpToCoreAsset: string,
    pct5LpToCoreAsset: string,
    pct10LpToCoreAsset: string,
    pct25LpToCoreAsset: string,
    assetsInfo: AssetInfo[]
}

interface LdIdToString {
    [key: number]: string;
}

const liquidityDirectionIdToName: LdIdToString = {
    6: 'Curve/Convex hBTC+WBTC',
    11: 'Curve/FraxConvex ETH+frxETH',
    4: 'Curve/Convex stETH+ETH',
    5: 'Curve/Convex alETH+ETH',
    3: 'Curve/Convex cEUR+agEUR+EUROC',
    8: 'Curve/Convex agEUR+EURT+EURS',
    1: 'Curve/Convex Mim+3CRV',
    10: 'Curve/FraxConvex Frax+USDC',
    9: 'Curve/Convex Frax+USDC',
    13: 'Curve/Convex multiBTC',
    12: 'Curve/Convex ETH+pETH',
    7: 'Curve/Convex renBTC+WBTC+sBTC',
    2: 'Curve/Convex Musd+3CRV'
}

async function initGoogleApi() {
    const clientEmail = process.env.GOOGLE_APIS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_APIS_PRIVATE_KEY;

    auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });

    sheetId = process.env.GOOGLE_APIS_SHEET_ID as string;
}

async function initProviders() {
    const rpcUrlMainnet = process.env.MAINNET_URL;

    providerMainnet = new ethers.providers.JsonRpcProvider(rpcUrlMainnet);
}

async function appendData(range: string, values: (string | null)[][]) {
    const sheet = google.sheets("v4")
    await sheet.spreadsheets.values.append({
        spreadsheetId: sheetId,
        auth: auth,
        range: range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
            values: values
        }
    })
}

async function getRatios(balances: BigNumber[]): Promise<number[]> {
    let res: number[] = [];
    const sum = balances.reduce((a, b) => a.add(b), BigNumber.from(0));

    for (let i = 0; i < balances.length; i++) {
        const balance = balances[i];

        const raitoBigInt = (balance.mul(10000)).div(sum);
        const ratio = raitoBigInt.toNumber() / 10000;

        res.push(ratio);
    }

    return res;
}

async function addCurrentLiquidityDirection(lds: (LiquidityDirectionInfo | null)[]) {
    let rows: (string | null)[][] = [];

    for (let i = 0; i < lds.length; i++) {
        const ld = lds[i];
        let row: (string | null)[] = [];

        if (ld == null) {
            row.push("UNSUPPORTED POOL");
            rows.push(row);
            continue;
        }

        row.push(
            new Date().toUTCString(),
            ld.poolName,
            ld.poolContract,
            ld.poolType,
            ld.coreAsset,
            ld.lpTotalSupply,
            ld.oneLpToCoreAsset,
            ld.pct1LpToCoreAsset,
            ld.pct5LpToCoreAsset,
            ld.pct10LpToCoreAsset,
            ld.pct25LpToCoreAsset,
            ld.assetsInfo.length.toString()
        );

        for (let i = 0; i < ld.assetsInfo.length; i++) {
            const asset = ld.assetsInfo[i];

            row.push(asset.ratio, asset.name, asset.contract)
        }

        rows.push(row);
    }

    console.log(rows);

    await appendData("Pools", rows);
}

async function getCurrentLiquidityDirection(): Promise<(LiquidityDirectionInfo | null)[]> {
    const activeStrategies = await getAllAssetActiveIds();
    let liquidityDirection: (LiquidityDirectionInfo | null)[] = [];

    for (let i = 0; i < activeStrategies.length; i++) {
        const strategyId = activeStrategies[i];
        const directionInfo = await getLiquidityDirectionInfo(strategyId);
        const poolInfo = getPoolInfo(directionInfo.entryData);
        if (poolInfo == null) {
            liquidityDirection.push(null);
            console.log("Poll info is null", strategyId)
            continue;
        }
        liquidityDirection.push(
            await tryGetCurveInfo(
                poolInfo.poolAddress,
                BigNumber.from(poolInfo.tokenIndexInCurve.toString()),
                directionInfo.assetId.toNumber(),
                strategyId.toNumber()
            ));
    }

    return liquidityDirection;
}

async function tryGetCurveInfo(pool: string, curveIndex: BigNumber, coreAssetId: number, ldId: number): Promise<LiquidityDirectionInfo | null> {
    const abiPool = require("./abis/mainnet/curve/pool.json");
    const abiToken = require("./abis/mainnet/curve/token.json");
    const contractPool = new ethers.Contract(pool, abiPool, providerMainnet);

    let tokens: string[] = [];
    for (let index = 0; ; index++) {
        try {
            tokens.push(await contractPool.callStatic.coins(index));
        } catch (error) {
            break;
        }
    }
    if (tokens.length < 2) return null;


    let balances: BigNumber[] = [];
    let names: string[] = [];
    for (let index = 0; ; index++) {
        try {
            const contractToken = new ethers.Contract(tokens[index], abiToken, providerMainnet);
            const decimals = contractToken.address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? 18 : await contractToken.callStatic.decimals();
            const decimalsDiff = BigNumber.from(18).sub(decimals);

            const balanceRaw: BigNumber = await contractPool.callStatic.balances(index);
            const name: string = contractToken.address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? "ETH" : await contractToken.callStatic.symbol();
            if (!decimalsDiff.eq(0)) {
                balances.push(balanceRaw.mul(BigNumber.from(10).pow(decimalsDiff)));
            }
            else {
                balances.push(balanceRaw);
            }
            names.push(name);
        } catch (error) {
            break;
        }
    }
    if (balances.length < 2 || names.length != tokens.length) return null;
    let assetsInfo: AssetInfo[] = [];
    const ratios = await getRatios(balances)
    for (let i = 0; i < names.length; i++) {
        assetsInfo.push({
            ratio: ratios[i].toString(),
            contract: tokens[i],
            name: names[i]
        })
    }

    let totalLp: BigNumber;
    try {
        const contractPoolAsToken = new ethers.Contract(pool, abiToken, providerMainnet);
        totalLp = await contractPoolAsToken.callStatic.totalSupply();
    } catch (error) {
        try {
            const lpTokenAddress = await contractPool.callStatic.lp_token();
            const contractToken = new ethers.Contract(lpTokenAddress, abiToken, providerMainnet);
            totalLp = await contractToken.callStatic.totalSupply();
        } catch (error) {
            return null;
        }
    }

    const contractToken = new ethers.Contract(tokens[curveIndex.toNumber()], abiToken, providerMainnet);
    let coreAssetDecimals: number;
    try {
        coreAssetDecimals = contractToken.address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? 18 : await contractToken.callStatic.decimals();
    } catch (error) {
        return null
    }
    const coreAssetInfo = getCoreAsset(coreAssetId);
    const tokenToConvert = contractToken.address == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" ? "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" : contractToken.address;

    const lpValue1: BigNumber = await contractPool.callStatic.calc_withdraw_one_coin(parseUnits("1.0", 18), curveIndex);
    const lpValue1Core = await convertToCoreAsset(lpValue1, tokenToConvert, coreAssetInfo.address, coreAssetDecimals);

    const pct1 = totalLp.mul(1).div(100);
    const pct5 = totalLp.mul(5).div(100);
    const pct10 = totalLp.mul(10).div(100);
    const pct25 = totalLp.mul(25).div(100);

    const lpValue1Pct: BigNumber = await contractPool.callStatic.calc_withdraw_one_coin(pct1, curveIndex);
    const lpValue5Pct: BigNumber = await contractPool.callStatic.calc_withdraw_one_coin(pct5, curveIndex);
    const lpValue10Pct: BigNumber = await contractPool.callStatic.calc_withdraw_one_coin(pct10, curveIndex);
    const lpValue25Pct: BigNumber = await contractPool.callStatic.calc_withdraw_one_coin(pct25, curveIndex);

    const lpValue1PctCore = await convertToCoreAsset(lpValue1Pct, tokenToConvert, coreAssetInfo.address, coreAssetDecimals);
    const lpValue5PctCore = await convertToCoreAsset(lpValue5Pct, tokenToConvert, coreAssetInfo.address, coreAssetDecimals);
    const lpValue10PctCore = await convertToCoreAsset(lpValue10Pct, tokenToConvert, coreAssetInfo.address, coreAssetDecimals);
    const lpValue25PctCore = await convertToCoreAsset(lpValue25Pct, tokenToConvert, coreAssetInfo.address, coreAssetDecimals);

    return {
        poolName: liquidityDirectionIdToName[ldId],
        poolContract: pool,
        poolType: getPoolType(coreAssetId),
        coreAsset: coreAssetInfo.symbol,
        lpTotalSupply: bigNumberToGoogleSheetValue(totalLp, 18),
        oneLpToCoreAsset: lpValue1Core.toString(),
        pct1LpToCoreAsset: lpValue1PctCore.toString(),
        pct5LpToCoreAsset: lpValue5PctCore.toString(),
        pct10LpToCoreAsset: lpValue10PctCore.toString(),
        pct25LpToCoreAsset: lpValue25PctCore.toString(),
        assetsInfo: assetsInfo
    }
}

type PriceInfo = {
    value: BigNumber,
    decimals: number
}

async function convertToCoreAsset(value: BigNumber, from: string, to: string, fromDecimals: number): Promise<number> {
    const priceFeedRouterAddress = "0x24733D6EBdF1DA157d2A491149e316830443FC00";
    const priceRouterABI = require("./abis/mainnet/alluo/priceRouter.json");
    const priceRouter = new Contract(priceFeedRouterAddress, priceRouterABI, providerMainnet);

    const priceUsdRaw: PriceInfo = await priceRouter.callStatic.getPriceOfAmount(from, value, "USD");
    const priceCoreAssetToUsdRaw: PriceInfo = await priceRouter.callStatic.getPrice(to, "USD");

    const priceCoreAssetToUsd = parseFloat(formatUnits(priceCoreAssetToUsdRaw.value, priceCoreAssetToUsdRaw.decimals));
    const priceUsd = parseFloat(formatUnits(priceUsdRaw.value, priceUsdRaw.decimals));

    return priceUsd / priceCoreAssetToUsd;
}

function bigNumberToGoogleSheetValue(value: BigNumber, decimals: number): string {
    const valueString = formatUnits(value, decimals);
    const split = valueString.split(".");
    const integer = split[0];
    const fraction = "0." + split[1];

    return `=${integer}+${fraction}`;
}

function getPoolType(value: number): string {
    switch (value) {
        case 0:
            return "USD";
        case 1:
            return "EUR";
        case 2:
            return "ETH";
        case 3:
            return "BTC";
        default:
            return "Unknown";
    }
}

function getCoreAsset(poolType: number): { symbol: string, address: string, decimals: number } {
    switch (poolType) {
        case 0:
            return { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 };
        case 1:
            return { symbol: "EURT", address: "0xC581b735A1688071A1746c968e0798D642EDE491", decimals: 6 };
        case 2:
            return { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 };
        case 3:
            return { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 };
        default:
            return { symbol: "USDC", address: constants.AddressZero, decimals: 0 };
    }
}

function getStrategyHandler(): Contract {
    const abi = require("./abis/mainnet/alluo/strategyHandler.json");
    const contractAddress = "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5";

    return new Contract(contractAddress, abi, providerMainnet);
}

async function getAllAssetActiveIds(): Promise<BigNumber[]> {
    const strategyHandler = getStrategyHandler();

    return await strategyHandler.getAllAssetActiveIds();
}

async function getLiquidityDirectionInfo(id: BigNumber): Promise<{
    strategyAddress: string;
    entryToken: string;
    assetId: BigNumber;
    chainId: BigNumber;
    entryData: string;
    exitData: string;
    rewardsData: string;
    latestAmount: BigNumber;
}> {
    const strategyHandler = getStrategyHandler();

    return await strategyHandler.liquidityDirection(id);
}

function getPoolInfo(entryData: string): { poolAddress: string, tokenIndexInCurve: number } | null {
    // First word must be address
    const addressWord = entryData.substring(0, 66);
    if (!addressWord.startsWith("0x000000000000000000000000")) {
        return null;
    }
    const address = "0x" + addressWord.substring(26);

    const decodedData = ethers.utils.defaultAbiCoder.decode(
        ["address", "uint256", "uint256", "uint256", "uint256", "uint256"],
        entryData
    )
    let indexOption: BigNumber = decodedData[4];
    if (indexOption.lt(10)) {
        return { poolAddress: address, tokenIndexInCurve: indexOption.toNumber() };
    }

    indexOption = decodedData[3];
    if (indexOption.lt(10)) {
        return { poolAddress: address, tokenIndexInCurve: indexOption.toNumber() };
    }
    return null;
}

export async function lambdaMain(event: any) {
    try {
        await initGoogleApi();
        await initProviders();

        const lds = await getCurrentLiquidityDirection();
        await addCurrentLiquidityDirection(lds);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'success',
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'error',
            }),
        };
    }
}

exports.main = lambdaMain;