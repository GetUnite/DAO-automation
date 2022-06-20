import snapshot from "@snapshot-labs/snapshot.js";
import { ethers as eth, Wallet } from "ethers";
import { ethers } from "hardhat";
import fs from 'fs';


type Times = {
    currentTime: Date,
    voteStartTime: Date,
    voteEndTime: Date,
    apyEndTime: Date
}

function UTCStringToRemiString(utsString: string): string {
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

function replaceAll(str: string, find: string, replace: string) {
    var re = new RegExp(find, 'g');

    return str.replace(re, replace);
}

function cloneDate(time: Date): Date {
    const newDate = new Date(time.valueOf());
    return newDate;
}

function getTimes(): Times {
    const currentTime = new Date(Date.now());
    let voteStartTime = new Date(cloneDate(currentTime).setUTCHours(13, 0, 0, 0));
    if (voteStartTime.valueOf() < currentTime.valueOf()) {
        console.warn("It is more than 13:00 GMT today, starting vote tommorow");
        voteStartTime.setDate(1 + voteStartTime.getDate());
    }
    const voteEndTime = new Date(cloneDate(voteStartTime).setUTCDate(voteStartTime.getUTCDate() + 4));
    const apyEndTime = new Date(cloneDate(voteEndTime).setUTCDate(voteEndTime.getUTCDate() + 14));

    console.log("Current time is", currentTime.toUTCString());
    console.log("Vote start time is", voteStartTime.toUTCString());
    console.log("Vote end time is", voteEndTime.toUTCString());
    console.log("APY end time is", apyEndTime.toUTCString());

    return {
        currentTime: currentTime,
        voteStartTime: voteStartTime,
        voteEndTime: voteEndTime,
        apyEndTime: apyEndTime
    }
}

function getBlockDelay(firstDate: Date, secondDate: Date, chainId: number): number {
    let msBlockTime = 15000;
    if (chainId != 1)
        msBlockTime = 4000
    const msDiff = secondDate.valueOf() - firstDate.valueOf();
    const blockDiff = Math.floor(msDiff / msBlockTime);
    console.log("Assuming block time is", msBlockTime, "ms, difference is", blockDiff);

    return blockDiff;
}

async function getCurrentBlock(mainnetProvider: eth.providers.BaseProvider): Promise<number> {
    const currentBlockNumber = await mainnetProvider.getBlockNumber();
    console.log("Current block on chainId", (await mainnetProvider.getNetwork()).chainId, "is", currentBlockNumber);

    return currentBlockNumber;
}

async function getIbAlluosAssets() {
    const liquidityBuffer = await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");
    const ibAlluos = await liquidityBuffer.callStatic.getListOfIbAlluos();
    const assets: string[] = [];
    console.log("Got ibAlluo list from Polygon, length", ibAlluos.length + ":")
    for (let i = 0; i < ibAlluos.length; i++) {
        const ibAlluo = await ethers.getContractAt("IIbAlluo", ibAlluos[i]);
        const asset = (await ibAlluo.callStatic.name()).replace("Interest Bearing Alluo ", "");
        console.log("\t" + asset, ":", ibAlluo.address);
        assets.push(asset);
    }

    return assets;
}

function getVoteOptions(voteDate: Date): number[] {
    const regexSpaces = /\d{2}\s[A-Z][a-z]{2}\s\d{4}/gm;
    const regexFile = /^\d{2}-[A-Z][a-z]{2}-\d{4}_apyProposalOptions\.json$/gm;
    const regexDate = /^\d{2}-[A-Z][a-z]{2}-\d{4}/gm;

    const baseDir = "./proposalOptions/apy";
    let path = `${baseDir}/${replaceAll(voteDate.toUTCString().match(regexSpaces)![0], " ", "-")}_apyProposalOptions.json`;
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
    console.log("Vote options:\n\t" + json.join("\n\t"));
    return json;
}

function msToSeconds(ms: number): number {
    return Math.round(ms / 1000);
}

function getAnnualInterestParam(apyPercent: number): number {
    return Math.round(apyPercent * 100);
}

function getInterestPerSecondParam(apyPercent: number): number {
    const secondsInYear = 31536000;
    const decimalApy = 1 + (apyPercent / 100);
    const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
    return Math.round(decimalInterest * (10 ** 17));
}

async function createVote(times: Times, asset: string, options: number[], blockSnapshot: number, chainId: number) {
    const title = `APY for the ${asset} pool: ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `What should be the APY for the ${asset} pool?

Note that if the spread is positive, the excess yield will be used to buy ALLUO from the balancer pool

If the the spread is negative, the missing yield will need to be financed by the treasury

Parameters for contract:
\`\`\`json
`;
    let hub = "https://hub.snapshot.org";
    let space = "alluo.eth";

    const optionsArgs = options.map((x) => {
        return {
            newAnnualInterest: getAnnualInterestParam(x),
            newInterestPerSecond: getInterestPerSecondParam(x),
            stringOption: `${x}% APY`
        }
    })
    body += JSON.stringify(optionsArgs, null, 4) + "\n```";

    if (chainId != 1) {
        console.log("Using testnet hub and space");
        hub = "https://testnet.snapshot.org";
        space = "0xtuytuy.eth";
    }
    else {
        console.log("Using mainnet hub and space");
    }

    const discussion = "https://discord.gg/jNaQF6sMxf";
    const plugins = JSON.stringify({});
    const type = "quadratic";
    const client = new snapshot.Client712(hub);
    const account = Wallet.fromMnemonic(process.env.MNEMONIC as string);

    const vote = {
        from: account.address,
        space: space,
        timestamp: msToSeconds(times.currentTime.valueOf()),
        type: type,
        title: title,
        body: body,
        discussion: discussion,
        choices: optionsArgs.map((x) => x.stringOption),
        start: msToSeconds(times.voteStartTime.valueOf()),
        end: msToSeconds(times.voteEndTime.valueOf()),
        snapshot: blockSnapshot,
        plugins: plugins
    };
    //console.log(vote);

    console.log("\tSigning and sending request...\n");
    await client.proposal(account, account.address, vote);
    console.log(`\tVoting for ${asset} created`);

}

async function main() {
    const mainnetProvider = ethers.getDefaultProvider(process.env.NODE_URL as string);
    const chainId = (await mainnetProvider.getNetwork()).chainId;

    const times = getTimes();
    const blockDiff = getBlockDelay(times.currentTime, times.voteStartTime, chainId);
    const currentBlock = await getCurrentBlock(mainnetProvider);
    const assets = await getIbAlluosAssets();
    const options = getVoteOptions(times.voteStartTime);

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        await createVote(times, asset, options, currentBlock + blockDiff, chainId);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
