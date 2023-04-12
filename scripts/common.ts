import { ethers as eth, Wallet } from "ethers";
import { ethers } from "hardhat";
import fs from 'fs';
import Twitter from "twitter-api-v2";
import fetch from 'node-fetch';
import { calculateReturns } from "./grabConvexAPY";
import { calculateBoosterFunds, calculateTotalBalances, calculateUserFunds } from "./getTotalBalances";
import { getBufferAmountsPolygon, getTotalLiquidityDirectionValue } from "./getLiquidityDirectionValues";
import https from "https";

export const voteExecutorMasterAddress = "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89";
export const voteExecutorMasterAddressMainnet = "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89";

export type Times = {
    currentTime: Date,
    voteStartTime: Date,
    voteEndTime: Date,
    apyEndTime: Date
}

export async function tweet(thread: string[]) {
    const appKey = process.env.TWITTER_APP_KEY as string;
    const appSecret = process.env.TWITTER_APP_SECRET as string;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN as string;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET as string;
    const client = new Twitter({
        appKey,
        appSecret,
        accessToken,
        accessSecret
    });
    console.log(thread);
    await client.v1.tweetThread(thread);
    console.log("Published");
}

export function UTCStringToRemiString(utsString: string): string {
    const regex = /\d{2}\s[A-Z][a-z]{2}\s\d{4}/gm;
    return utsString.match(regex)![0]
        .replace(/\s/, "-")
        .replace(/\s/, "-")
        .replace("Jan", "January")
        .replace("Feb", "February")
        .replace("Mar", "March")
        .replace("Apr", "April")
        .replace("Jun", "June")
        .replace("Jul", "July")
        .replace("Aug", "August")
        .replace("Sep", "September")
        .replace("Oct", "October")
        .replace("Nov", "November")
        .replace("Dec", "December");
}

export function replaceAll(str: string, find: string, replace: string) {
    var re = new RegExp(find, 'g');

    return str.replace(re, replace);
}

export function cloneDate(time: Date): Date {
    const newDate = new Date(time.valueOf());
    return newDate;
}

export function getBlockDelay(firstDate: Date, secondDate: Date, chainId: number): number {
    let msBlockTime = 15000;
    if (chainId != 1)
        msBlockTime = 4000
    const msDiff = secondDate.valueOf() - firstDate.valueOf();
    const blockDiff = Math.floor(msDiff / msBlockTime);
    console.log("Assuming block time is", msBlockTime, "ms, difference is", blockDiff);

    return blockDiff;
}

export async function getCurrentBlock(mainnetProvider: eth.providers.BaseProvider): Promise<number> {
    const currentBlockNumber = await mainnetProvider.getBlockNumber();
    console.log("Current block on chainId", (await mainnetProvider.getNetwork()).chainId, "is", currentBlockNumber);

    return currentBlockNumber;
}

export async function getIbAlluosAssets(): Promise<{ asset: string, symbol: string }[]> {
    const timerProvider = ethers.getDefaultProvider(process.env.POLYGON_URL as string);
    const liquidityBufferInterface = await (await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1")).interface;
    let liquidityBuffer = new ethers.Contract("0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1", liquidityBufferInterface, timerProvider);


    const ibAlluos = await liquidityBuffer.callStatic.getListOfIbAlluos();
    const assets: { asset: string, symbol: string }[] = [];
    console.log("Got ibAlluo list from Polygon, length", ibAlluos.length + ":")
    for (let i = 0; i < ibAlluos.length; i++) {
        const ibAlluo = await ethers.getContractAt("IIbAlluo", ibAlluos[i]);
        const iballuoContract = new ethers.Contract(ibAlluos[i], ibAlluo.interface, timerProvider);
        const asset = (await iballuoContract.callStatic.name()).replace("Interest Bearing Alluo ", "");
        console.log("\t" + asset, ":", iballuoContract.address);
        assets.push({ asset: asset, symbol: await iballuoContract.symbol() });
    }

    return assets;
}

export async function getVoteOptions(voteDate: Date, optionsType: string, folder: string): Promise<any[]> {
    const regexFileString = `^\\d{2}-[A-Z][a-z]{2}-\\d{4}_${optionsType}\\.json$`
    const regexSpaces = /\d{2}\s[A-Z][a-z]{2}\s\d{4}/gm;
    const regexFile = new RegExp(regexFileString, "gm");
    const regexDate = /^\d{2}-[A-Z][a-z]{2}-\d{4}/gm;

    const baseDir = `./proposalOptions/${folder}`;
    let path = `${baseDir}/${replaceAll(voteDate.toUTCString().match(regexSpaces)![0], " ", "-")}_${optionsType}.json`;
    if (!fs.existsSync(path)) {
        // console.warn("Couldn't find file with options for vote stare date at", "'" + path + "',", "searching for latest file...");
        const files = fs.readdirSync(baseDir).filter((x) => x.match(regexFile) != null).sort((a: string, b: string) => {
            const dateA = Date.parse(a.match(regexDate)![0]);
            const dateB = Date.parse(b.match(regexDate)![0]);

            return dateB - dateA;
        });
        if (files.length == 0)
            throw new Error("Can't find any file with vote options.");
        path = `${baseDir}/${files[0]}`
        console.log("Found latest file:", "'" + path + "'");
    }
    else {
        // console.log("Found file with options for today at", "'" + path + "'");
    }

    const json: any[] = require("." + path);
    console.log(optionsType, "options:\n\t" + json.join("\n\t"));
    if (folder == "liquidityDirectionOptions") {
        console.log("Json before", json)
        for (let i = 0; i < json.length; i++) {
            let currentOption = json[i];
            let splittedOption = currentOption.split(" ");
            let llamaAPICode = splittedOption[splittedOption.length - 1];
            json[i] = await getAPY(currentOption, llamaAPICode)
        }
        console.log("json after", json)
    }
    else if (folder == "treasuryPercentageOptions") {
        let treasuryValueToday = 0;
        // Value of token balances as well as Alluo uniswapv3 pool position (only ETH part)
        let totalGnosisTokenBalances = await calculateTotalBalances(["0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3", "0x2580f9954529853Ca5aC5543cE39E9B5B1145135", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89"]);

        // Value of all funds inside booster pools held by gnosis
        let boosterFundsValue = await calculateBoosterFunds("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");

        // Value of all liquidity direction locked on mainnet
        let totalLiquidityDirectionValue = await getTotalLiquidityDirectionValue()

        // Value of all buffer funds on polygon
        let totalBufferValue = await getBufferAmountsPolygon()

        treasuryValueToday += totalGnosisTokenBalances
        treasuryValueToday += boosterFundsValue
        treasuryValueToday += totalLiquidityDirectionValue
        treasuryValueToday += totalBufferValue

        console.log("Inflated estimate of treasury value before deductions", treasuryValueToday);

        // Subtract all user funds
        let totalCustomerFunds = await calculateUserFunds()
        console.log("Total customer funds", totalCustomerFunds);

        treasuryValueToday -= totalCustomerFunds;
        console.log("Final estimate of treasury value today", treasuryValueToday);

        let treasuryValueCurrentlyDeployed = totalLiquidityDirectionValue + totalBufferValue - totalCustomerFunds;
        console.log("TOtal treasury value currently deployed", treasuryValueCurrentlyDeployed);
        json.push([treasuryValueCurrentlyDeployed.toFixed(0), treasuryValueToday.toFixed(0)])
        console.log("json after", json);
    }
    return json;
}

async function getAPY(voteOption: string, llamaAPICode: string): Promise<string> {
    let estimatedFactorAbove = 0;
    if (voteOption == "Do nothing") {
        return voteOption;
    }
    if (llamaAPICode.split("-")[0] == "HISTORICAL") {
        let final2WeekAPR = await getHistoricalAPY(voteOption, llamaAPICode)
        return formatVoteOption(final2WeekAPR.toString(), voteOption);
    }

    else if (llamaAPICode.length > 36) {
        // Estimated margin from FraxConvex yield above convexfinance yields
        let splitted = llamaAPICode.split("-")
        estimatedFactorAbove = Number(splitted[splitted.length - 1]);
        llamaAPICode = llamaAPICode.slice(0, -5)
    }

    let requestURL = "https://yields.llama.fi/chart/" + llamaAPICode;
    try {
        const response = await fetch(requestURL);
        const data = await response.json();
        let latestData = data.data[data.data.length - 1];
        let latestAPY = latestData["apy"] + estimatedFactorAbove;
        return formatVoteOption(latestAPY.toString(), voteOption);
    } catch (error) {
        console.error(error);
        return String(error);
    }
}

function formatVoteOption(latestAPY: string, voteOption: string): string {
    let latestAPY2DP = Number(latestAPY).toFixed(2);
    let splittedOption = voteOption.split(" ");
    splittedOption.pop();
    voteOption = splittedOption.join(" ");
    voteOption += " " + latestAPY2DP + "%";
    return voteOption;
}

async function getHistoricalAPY(voteOption: string, llamaAPICode: string): Promise<number> {
    console.log("Calculating historical performance...")
    let splitted = llamaAPICode.split("-")
    let convexPool1 = splitted[1]
    let curvePool1 = splitted[2]
    let index1 = Number(splitted[3])
    let curvePool2 = ""
    let index2 = 0
    if (splitted.length > 4) {
        curvePool2 = splitted[4]
        index2 = Number(splitted[5])
    }
    return (await calculateReturns(14, convexPool1, curvePool1, index1, curvePool2, index2))[0]
}

export function getTimes(voteStartHour: number, voteLengthSeconds: number, voteEffectLengthSeconds: number, test: boolean): Times {
    let voteStartTime = new Date(Date.now());
    // // search for next Sunday
    let voteEndTime = new Date(Date.now());
    while (voteEndTime.getDay() != 0) {
        voteEndTime.setUTCDate(
            voteEndTime.getUTCDate() + 1
        );
    }
    const voteEffectEndTime = new Date(cloneDate(voteEndTime).valueOf() + voteEffectLengthSeconds);
    console.log("Vote start time is", voteStartTime.toUTCString());
    console.log("Vote end time is", voteEndTime.toUTCString());
    console.log("Vote effect end time is", voteEffectEndTime.toUTCString());

    return {
        currentTime: voteStartTime,
        voteStartTime: voteStartTime,
        voteEndTime: voteEndTime,
        apyEndTime: voteEffectEndTime
    }
}

export function msToSeconds(ms: number): number {
    return Math.round(ms / 1000);
}

export async function getTokenPrice(tokenAddress: string, network: string): (Promise<number>) {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        tokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    }
    else if (tokenAddress == "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f" && network == "polygon-pos") {
        // EURT doesnt have a price on polygon
        tokenAddress = "0xc581b735a1688071a1746c968e0798d642ede491"
        network = "ethereum"
    }
    let url = `https://api.coingecko.com/api/v3/coins/${network}/contract/${tokenAddress}`;

    // Coingecko keeps rate limiting randomly.
    await delay(5000);

    const getPrice = () => {
        return new Promise((resolve, reject) => {
            https.get(url, (resp) => {
                let data = "";
                resp.on("data", (chunk) => {
                    data += chunk;
                });
                resp.on("end", () => {
                    const price = JSON.parse(data);
                    resolve(price.market_data.current_price.usd);
                });
                resp.on("error", (err) => {
                    reject(err)
                })
            });
        })
    }
    let price = undefined;
    let retries = 0;
    while (price == undefined) {
        if (retries > 10) {
            throw new Error("Could not get price")
        }
        try {
            price = await getPrice() as number;
        } catch (err) {
            console.log("Errored out, retrying");
            await delay(5000)
            retries += 1
        }
    }

    return price;
}

const delay = (delayInms: number) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
}

