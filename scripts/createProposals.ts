import snapshot from "@snapshot-labs/snapshot.js";
import { Contract, ethers as eth, Wallet } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { ethers } from "hardhat";

import {
    Times, UTCStringToRemiString, getBlockDelay, getIbAlluosAssets,
    msToSeconds, getTimes, getCurrentBlock, getVoteOptions,
    voteExecutorMasterAddress,
    voteExecutorMasterAddressMainnet,
    tweet,
} from "./common";

function getAnnualInterestParam(apyPercent: number): number {
    return Math.round(apyPercent * 100);
}

function getInterestPerSecondParam(apyPercent: number): string {
    const secondsInYear = 31536000;
    const decimalApy = 1 + (apyPercent / 100);
    const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
    return Math.round(decimalInterest * (10 ** 17)).toString();
}

async function createTreasuryVote(
    times: Times,
    options: string[],
    blockSnapshot: number,
    chainId: number,
) {
    const title = `Percentage of treasury invested:  ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `What should be the percentage of the treasury invested in the protocol?

All the yield that is generated from this position will be used to contribute ETH to the ETH-ALLUO Balancer pool.

The more we invest the more we can generate yield and contribute ETH to the pool but it creates a risk to the protocol's treasury.`

    let hub = "https://hub.snapshot.org";
    let space = "alluo.eth";

    if (chainId != 1) {
        console.log("Using testnet hub and space");
        hub = "https://testnet.snapshot.org";
        space = "0xtuytuy.eth";
    }
    else {
        console.log("Using mainnet hub, space and contract");
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
        choices: options,
        start: msToSeconds(times.voteStartTime.valueOf()),
        end: msToSeconds(times.voteEndTime.valueOf()),
        snapshot: blockSnapshot,
        plugins: plugins
    };
    console.log(vote);

    console.log("\tSigning and sending request...\n");
    await client.proposal(account, account.address, vote);
    console.log(`\tVoting for Treasury percentage created`);
}

async function createMintVote(
    times: Times,
    options: string[],
    blockSnapshot: number,
    chainId: number,
    provider: eth.providers.BaseProvider
) {
    const title = `How many $ALLUO tokens should be used to reward Lockers for ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`
    let body = `Lockers of $ALLUO tokens indicate that they are willing to participate in the governance of the protocol. For this participation, they are rewarded $ALLUO as a reward.

These new $ALLUO are newly minted tokens that ultimately dilute all token holders. 

This vote is to agree on how many new $ALLUO tokens the DAO wants to mint to reward participants in the governance process of the next 2 weeks.

To understand more read our articles here: 
- https://blog.alluo.io/alluo-governance-a-start-c4d3cd1c2eb9
- https://blog.alluo.io/alluo-tokenomics-e6fc83e902e9

Parameters for contract:
\`\`\`json
`;

    let hub = "https://hub.snapshot.org";
    let space = "alluo.eth";
    let veMasterInterface = (await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddressMainnet)).interface;
    let veMaster = new Contract(voteExecutorMasterAddressMainnet, veMasterInterface, provider);

    if (chainId != 1) {
        console.log("Using testnet hub and space");
        hub = "https://testnet.snapshot.org";
        space = "0xtuytuy.eth";
        veMasterInterface = (await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddress)).interface;
        veMaster = new Contract(voteExecutorMasterAddress, veMasterInterface, provider);
    }
    else {
        console.log("Using mainnet hub, space and contract");
    }

    const optionsArgs = await Promise.all(
        options.map(async (x) => {
            const res = await veMaster.callStatic.encodeMintCommand(
                parseUnits(x.split(" ")[0].replace(",", ""), 18),
                14
            );
            return {
                data: {
                    cmdIndex: res[0].toString(),
                    cmd: res[1]
                },
                stringOption: x
            }
        })
    )

    const proposalType = "mintProposal"

    body += JSON.stringify({
        type: proposalType,
        args: optionsArgs
    }, null, 4) + "\n```";

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
    console.log(`\tVoting for ALLUO mint created`);
}

async function createLDVote(
    times: Times,
    asset: string,
    options: string[],
    blockSnapshot: number,
    chainId: number,
) {
    const title = `[${asset}] Liquidity Direction: ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `Liquidity direction for for all assets in the ${asset} farm with Alluo.

Each voted option will need a minimum of 5% of the total votes to be executed.`

    let hub = "https://hub.snapshot.org";
    let space = "alluo.eth";

    if (chainId != 1) {
        console.log("Using testnet hub and space");
        hub = "https://testnet.snapshot.org";
        space = "0xtuytuy.eth";
    }
    else {
        console.log("Using mainnet hub, space and contract");
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
        choices: options,
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

async function createAPYVote(
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
    let veMasterInterface = (await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddressMainnet)).interface;
    let veMaster = new Contract(voteExecutorMasterAddressMainnet, veMasterInterface, provider);

    if (chainId != 1) {
        console.log("Using testnet hub and space");
        hub = "https://testnet.snapshot.org";
        space = "0xtuytuy.eth";
        veMasterInterface = (await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddress)).interface;
        veMaster = new Contract(voteExecutorMasterAddress, veMasterInterface, provider);
    }
    else {
        console.log("Using mainnet hub, space and contract");
    }

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

    const proposalType = "apyProposal"

    body += JSON.stringify({
        type: proposalType,
        args: optionsArgs
    }, null, 4) + "\n```";

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
    // used for snapshot, voteExecutorMaster call, getting timestamps
    const mainnetProvider = ethers.getDefaultProvider(process.env.NODE_URL as string);
    const chainId = (await mainnetProvider.getNetwork()).chainId;

    const timerProvider = ethers.getDefaultProvider(process.env.POLYGON_URL as string);
    let timerInterface = (await ethers.getContractAt("VoteTimer", voteExecutorMasterAddressMainnet)).interface;
    let timer = new Contract("0xA27082C3334628C306ba022b1E6e2A9CA92e558f", timerInterface, timerProvider);

    if (!await timer.canExecute2WeekVote()) {
        console.log("Timer says that it is not time to create votes, exiting...");
        return;
    }
    console.log("Timer says that it is time to create votes");

    const voteStartHour = Number.parseInt(process.env.APY_VOTE_START_HOUR as string);
    const voteLengthSeconds = Number.parseInt(process.env.APY_VOTE_LENGTH_MSECONDS as string);
    const voteEffectLengthSeconds = Number.parseInt(process.env.APY_VOTE_EFFECT_LENGTH_MSECONDS as string);

    const times = getTimes(voteStartHour, voteLengthSeconds, voteEffectLengthSeconds);
    const blockDiff = getBlockDelay(times.currentTime, times.voteStartTime, chainId);
    const currentBlock = await getCurrentBlock(mainnetProvider);
    const assets = await getIbAlluosAssets();

    try {
        const optionsMint = getVoteOptions(times.voteStartTime, "mintProposalOptions", "mintProposalOptions");

        await createMintVote(times, optionsMint, currentBlock + blockDiff, chainId, mainnetProvider);

    } catch (error) {
        console.log(error);
    }

    try {
        const optionsTreasury = getVoteOptions(times.voteStartTime, "treasuryPercentageOptions", "treasuryPercentageOptions");

        await createTreasuryVote(times, optionsTreasury, currentBlock + blockDiff, chainId);

    } catch (error) {
        console.log(error);
    }

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        try {
            const optionsApy = getVoteOptions(times.voteStartTime, "apyProposalOptions_" + asset.asset, "apyProposalOptions");

            await createAPYVote(times, asset.asset, asset.symbol, optionsApy, currentBlock + blockDiff, chainId, mainnetProvider);
        } catch (error) {
            console.log(error);
        }

        try {
            const optionsLd = getVoteOptions(times.voteStartTime, "liquidityDirectionOptions_" + asset.asset, "liquidityDirectionOptions");

            await createLDVote(times, asset.asset, optionsLd, currentBlock + blockDiff, chainId);
        } catch (error) {
            console.log(error);
        }
    }

    const tweetText = `A new governance round is live for $ALLUO lockers.

We invite all token holders to participate and benefit from the APY difference between realised APY and advertised APY.

https://vote.alluo.com/`;

    await tweet([tweetText]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
