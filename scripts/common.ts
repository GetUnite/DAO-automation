import { ethers as eth, Wallet } from "ethers";
import { ethers } from "hardhat";
import fs from 'fs';
import Twitter from "twitter-api-v2";

export const voteExecutorMasterAddress = "0x279c129a1d2f9213c6e326b729d9fe0cd4941a05";

export type Times = {
    currentTime: Date,
    voteStartTime: Date,
    voteEndTime: Date,
    apyEndTime: Date
}

export async function tweet(text: string) {
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

    await client.v1.tweet(text);
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
    const liquidityBuffer = await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");
    const ibAlluos = await liquidityBuffer.callStatic.getListOfIbAlluos();
    const assets: { asset: string, symbol: string }[] = [];
    console.log("Got ibAlluo list from Polygon, length", ibAlluos.length + ":")
    for (let i = 0; i < ibAlluos.length; i++) {
        const ibAlluo = await ethers.getContractAt("IIbAlluo", ibAlluos[i]);
        const asset = (await ibAlluo.callStatic.name()).replace("Interest Bearing Alluo ", "");
        console.log("\t" + asset, ":", ibAlluo.address);
        assets.push({ asset: asset, symbol: await ibAlluo.symbol() });
    }

    return assets;
}

export function getApyVoteOptions(voteDate: Date, optionsType: string): number[] {
    const regexFileString = `^\\d{2}-[A-Z][a-z]{2}-\\d{4}_${optionsType}\\.json$`
    const regexSpaces = /\d{2}\s[A-Z][a-z]{2}\s\d{4}/gm;
    const regexFile = new RegExp(regexFileString, "gm");
    const regexDate = /^\d{2}-[A-Z][a-z]{2}-\d{4}/gm;

    const baseDir = `./proposalOptions/${optionsType}`;
    let path = `${baseDir}/${replaceAll(voteDate.toUTCString().match(regexSpaces)![0], " ", "-")}_${optionsType}.json`;
    if (!fs.existsSync(path)) {
        console.warn("Couldn't find file with options for vote stare date at", "'" + path + "',", "searching for latest file...");
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
        console.log("Found file with options for today at", "'" + path + "'");
    }

    const json: number[] = require("." + path);
    console.log("APY vote options:\n\t" + json.join("\n\t"));
    return json;
}

export function getTimes(voteStartHour: number, voteLengthSeconds: number, voteEffectLengthSeconds: number): Times {
    const currentTime = new Date(Date.now());
    let voteStartTime = new Date(cloneDate(currentTime).setUTCHours(voteStartHour, 0, 0, 0));
    if (voteStartTime.valueOf() < currentTime.valueOf()) {
        console.warn(`It is more than ${voteStartHour}:00 GMT right now, starting vote tommorow`);
        voteStartTime.setDate(1 + voteStartTime.getDate());
    }
    const voteEndTime = new Date(cloneDate(voteStartTime).valueOf() + voteLengthSeconds);
    const voteEffectEndTime = new Date(cloneDate(voteEndTime).valueOf() + voteEffectLengthSeconds);

    console.log("Current time is", currentTime.toUTCString());
    console.log("Vote start time is", voteStartTime.toUTCString());
    console.log("Vote end time is", voteEndTime.toUTCString());
    console.log("Vote effect end time is", voteEffectEndTime.toUTCString());

    return {
        currentTime: currentTime,
        voteStartTime: voteStartTime,
        voteEndTime: voteEndTime,
        apyEndTime: voteEffectEndTime
    }
}

export function msToSeconds(ms: number): number {
    return Math.round(ms / 1000);
}