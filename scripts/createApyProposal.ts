import snapshot from "@snapshot-labs/snapshot.js";
import { Contract, ethers as eth, Wallet } from "ethers";
import { ethers } from "hardhat";

import {
    Times, UTCStringToRemiString, getBlockDelay, getIbAlluosAssets,
    msToSeconds, getTimes, getCurrentBlock, getApyVoteOptions,
    voteExecutorMasterAddress
} from "./common";

const proposalType = "apyProposal"

function getAnnualInterestParam(apyPercent: number): number {
    return Math.round(apyPercent * 100);
}

function getInterestPerSecondParam(apyPercent: number): string {
    const secondsInYear = 31536000;
    const decimalApy = 1 + (apyPercent / 100);
    const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
    return Math.round(decimalInterest * (10 ** 17)).toString();
}

async function createVote(
    times: Times,
    asset: string,
    ibAlluoSymbol: string,
    options: number[],
    blockSnapshot: number,
    chainId: number,
    provider: eth.providers.BaseProvider
) {
    const title = `APY for the ${asset} pool: ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `What should be the APY for the ${asset} pool?

Note that if the spread is positive, the excess yield will be used to buy ALLUO from the balancer pool

If the the spread is negative, the missing yield will need to be financed by the treasury

Parameters for contract:
\`\`\`json
`;
    let hub = "https://hub.snapshot.org";
    let space = "alluo.eth";

    const veMasterInterface = (await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddress)).interface;
    const veMaster = new Contract(voteExecutorMasterAddress, veMasterInterface, provider)

    const optionsArgs = await Promise.all(
        options.map(async (x) => {
            const res = await veMaster.callStatic.encodeApyCommand(
                ibAlluoSymbol,
                getAnnualInterestParam(x),
                getInterestPerSecondParam(x));
            return {
                data: {
                    cmdIndex: res[0].toString(),
                    cmd: res[1]
                },
                stringOption: `${x}% APY`
            }
        })
    )

    body += JSON.stringify({
        type: proposalType,
        args: optionsArgs
    }, null, 4) + "\n```";

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
    console.log(vote);

    console.log("\tSigning and sending request...\n");
    await client.proposal(account, account.address, vote);
    console.log(`\tVoting for ${asset} created`);
}

async function main() {
    const mainnetProvider = ethers.getDefaultProvider(process.env.NODE_URL as string);
    const chainId = (await mainnetProvider.getNetwork()).chainId;

    const voteStartHour = Number.parseInt(process.env.APY_VOTE_START_HOUR as string);
    const voteLengthSeconds = Number.parseInt(process.env.APY_VOTE_LENGTH_MSECONDS as string);
    const voteEffectLengthSeconds = Number.parseInt(process.env.APY_VOTE_EFFECT_LENGTH_MSECONDS as string);

    const times = getTimes(voteStartHour, voteLengthSeconds, voteEffectLengthSeconds);
    const blockDiff = getBlockDelay(times.currentTime, times.voteStartTime, chainId);
    const currentBlock = await getCurrentBlock(mainnetProvider);
    const assets = await getIbAlluosAssets();
    const options = getApyVoteOptions(times.voteStartTime, proposalType + "Options");

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        await createVote(times, asset.asset, asset.symbol, options, currentBlock + blockDiff, chainId, mainnetProvider);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
