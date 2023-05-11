import { reset } from "@nomicfoundation/hardhat-network-helpers";
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
function numberWithCommas(x: string) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

async function createTreasuryVote(
    treasuryValue: number[],
    options: string[],
    blockSnapshot: number,
    chainId: number,
) {
    const times = getTimes();
    const title = `Percentage of treasury invested:  ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `What should be the percentage of the treasury invested in the protocol? 

The previous treasury invested in the protocol is: $${numberWithCommas(treasuryValue[0].toString())}
The current treasury value is: $${numberWithCommas(treasuryValue[1].toString())}

In the spirit of putting our money where our mouth is, this vote is asking DAO members to decide on how much of the treasury liquidity should be invested in the Alluo protocol.

The more we invest into our own protocol, the more yield we can generate for Voters.

The liquidity will be invested in the USD farm to avoid exposure to volatile assets

Parameters for contract:
\`\`\`json
`

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


    const proposalType = "Treasury Vote"
    body += JSON.stringify({
        type: proposalType,
        args: options,
        value: treasuryValue
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
    options: string[],
    blockSnapshot: number,
    chainId: number,
    provider: eth.providers.BaseProvider
) {
    const times = getTimes();
    const title = `How many $ALLUO tokens should be used to reward Lockers for ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`
    let body = `Lockers of $ALLUO tokens indicate that they are willing to participate in the governance of the protocol. For this participation, they are rewarded $ALLUO as a reward.

These new $ALLUO are newly minted tokens that ultimately dilute all token holders. 

This vote is to agree on how many new $ALLUO tokens the DAO wants to mint to reward participants in the governance process of the next 2 weeks.

To understand more read our articles here: 
- https://blog.alluo.com/alluo-governance-a-start-c4d3cd1c2eb9
- https://blog.alluo.com/alluo-tokenomics-v2-3ff53bebcf8d

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
    asset: string,
    options: string[],
    blockSnapshot: number,
    chainId: number,
) {
    const times = getTimes();
    const title = `[${asset}] Liquidity Direction: ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `Liquidity direction for all assets in the ${asset} farm with Alluo.

Each voted option will need a minimum of 5% of the total votes to be executed.

Parameters for contract:
\`\`\`json
`

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



    const proposalType = "Liquidity Direction Vote"
    body += JSON.stringify({
        type: proposalType,
        args: options
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
    asset: string,
    ibAlluoSymbol: string,
    options: number[],
    blockSnapshot: number,
    chainId: number,
    provider: eth.providers.BaseProvider
) {
    const times = getTimes();
    const title = `Advertised APY for the ${asset} pool: ${UTCStringToRemiString(times.voteEndTime.toUTCString())} to ${UTCStringToRemiString(times.apyEndTime.toUTCString())}`;
    let body = `What should be the advertised APY for the ${asset} pool?

The Advertised APY is promised to depositors for one governance cycle. The higher the difference between the Advertised APY and the Realised APY (what we can achieve via Liquidity Direction) the more value will be redistributed to Voters.

The mechanism used to redistribute value to Voters has been described by the core team in this article: 

- https://blog.alluo.com/alluo-tokenomics-v2-3ff53bebcf8d

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
    let chainId = (await mainnetProvider.getNetwork()).chainId;
    let test = false;

    const timerProvider = ethers.getDefaultProvider(process.env.POLYGON_URL as string);
    let timerInterface = (await ethers.getContractAt("VoteTimer", voteExecutorMasterAddressMainnet)).interface;
    let timer = new Contract("0xA27082C3334628C306ba022b1E6e2A9CA92e558f", timerInterface, timerProvider);

    if (test) {
        chainId = 99999
    } else {
        if (!await timer.canExecute2WeekVote()) {
            console.log("Timer says that it is not time to create votes, exiting...");
            return;
        }
    }

    console.log("Timer says that it is time to create votes");

    const voteStartHour = Number.parseInt(process.env.APY_VOTE_START_HOUR as string);
    const voteLengthSeconds = Number.parseInt(process.env.APY_VOTE_LENGTH_MSECONDS as string);

    const blockDiff = 0;

    let currentBlock = await getCurrentBlock(mainnetProvider);
    if (chainId == 99999) {
        currentBlock = await getCurrentBlock(ethers.getDefaultProvider(process.env.TEST_URL));
    }
    const assets = await getIbAlluosAssets();

    try {
        const optionsTreasury = await getVoteOptions("treasuryPercentageOptions", "treasuryPercentageOptions");
        await createTreasuryVote(optionsTreasury[1], optionsTreasury[0], currentBlock + blockDiff, chainId);

    } catch (error) {
        console.log(error);
    }

    try {
        const optionsMint = await getVoteOptions("mintProposalOptions", "mintProposalOptions");
        await createMintVote(optionsMint, currentBlock + blockDiff, chainId, mainnetProvider);

    } catch (error) {
        console.log(error);
    }

    for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];

        try {
            const optionsApy = await getVoteOptions("apyProposalOptions_" + asset.asset, "apyProposalOptions");

            await createAPYVote(asset.asset, asset.symbol, optionsApy, currentBlock + blockDiff, chainId, mainnetProvider);
        } catch (error) {
            console.log(error);
        }

        try {
            const optionsLd = await getVoteOptions("liquidityDirectionOptions_" + asset.asset, "liquidityDirectionOptions");
            await createLDVote(asset.asset, optionsLd, currentBlock + blockDiff, chainId);
        } catch (error) {
            console.log(error);
        }
    }

    const tweetText = `🔥Attention $ALLUO token holders!🔥

It's time to make your voice heard!🗣️

Vote where to invest deposits and reap the rewards from the difference in realised APY and what is paid to depositors!💰

Vote now at https://vote.alluo.com/

#ALLUO #liquiditydirection #governance`;

    await tweet([tweetText]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
