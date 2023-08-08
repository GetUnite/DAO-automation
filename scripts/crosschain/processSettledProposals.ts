import { BigNumber, Contract, Wallet } from "ethers";
import { Proposal, extractVoteParamsFromProposalBody } from "./snapshot";
import { ethers } from "hardhat";
import { settings } from "./settings";
import { parseEther } from "ethers/lib/utils";

export type winningParam = {
    data: {
        cmdIndex: string;
        cmd: string;
    };
    stringOption: string;
}

type VoteParams = {
    type: string,
    args: {
        data: {
            cmdIndex: string,
            cmd: string,
        }
        stringOption: string
    }[],
    value: number[]
};

export async function processLDProposal(proposal: Proposal, params: VoteParams) {
    let winningParams: winningParam[] = []

    const optimismUrl = new ethers.providers.JsonRpcProvider(settings.optimismUrl);

    const veUtils = (await ethers.getContractAt("IVoteExecutorMasterUtils", settings.voteExecutorUtilsAddress)).connect(optimismUrl);
    const strategyHandler = (await ethers.getContractAt("IStrategyHandler", settings.strategyHandlerAddress)).connect(optimismUrl);

    const numberOfAssets = await strategyHandler.callStatic.numberOfAssets();
    let activeNumStrategies: Number[] = [];
    for (let i = 0; i < numberOfAssets; i++) {
        activeNumStrategies.push(
            ...(await strategyHandler.getActiveDirectionsForAssetId(i)).map((direction) => direction.toNumber())
        );
    }
    // console.log("Current active strategies nums", activeNumStrategies)


    // Replace all votes with less than 5% with 0.
    const totalVotesCasted = proposal.scores.reduce((previousValue, currentValue) => previousValue + currentValue)
    proposal.scores = proposal.scores.map((score: number) => { return score < totalVotesCasted * 0.05 ? 0 : score; });
    const newTotalVotesCasted = proposal.scores.reduce((previousValue, currentValue) => previousValue + currentValue)

    // console.log("New total votes casted", newTotalVotesCasted);
    // console.log("totalVotesCasted", totalVotesCasted);

    for (let i = 0; i < proposal.scores.length; i++) {
        if (proposal.scores.length == 1 && proposal.choices[i] == "Do nothing") {
            return [];
        }
        let commandKeyWord = proposal.choices[i].split(" ").slice(0, 2).join(" ");

        if (commandKeyWord.includes("Curve/Convex")) {
            continue;
        }

        // console.log("CommandKeyword:", commandKeyWord)
        const directionId = Number(await strategyHandler.callStatic.directionNameToId(commandKeyWord));
        // console.log("Current directionId", directionId)
        if (proposal.scores[i] == 0 && !activeNumStrategies.includes(directionId)) {
            // console.log("Ignoring this vote...")
            continue
        }
        const percentage = proposal.scores[i] / newTotalVotesCasted * 10000
        // console.log("Percentage:", percentage.toFixed(0), "commandKeyword", commandKeyWord)

        const data = await veUtils.callStatic.encodeLiquidityCommand(commandKeyWord, percentage.toFixed(0), 0);
        winningParams.push({ data: { cmdIndex: data[0].toString(), cmd: data[1] }, stringOption: commandKeyWord })
    }
    return winningParams
}

export async function processAPYProposal(proposal: Proposal, params: VoteParams): Promise<winningParam[]> {
    const winningOption = await getWinningVoteOption(proposal);
    const winningParam = params!.args.find((x) => x.stringOption == winningOption)!;
    if (!(winningParam.stringOption == '0 $ALLUO - 0% APR')) {
        return [winningParam];
    }

    return [];
}

export async function processTreasuryProposal(proposal: Proposal, params: VoteParams): Promise<winningParam[]> {
    const winningOption = await getWinningVoteOption(proposal);
    const optimismUrl = new ethers.providers.JsonRpcProvider(settings.optimismUrl);

    const veUtils = (await ethers.getContractAt("IVoteExecutorMasterUtils", settings.voteExecutorUtilsAddress)).connect(optimismUrl);

    if (winningOption === null) {
        throw new Error("Looks like noone voted on proposal id " + proposal.id);
    }
    if (winningOption === undefined) {
        throw new Error("There are votes that got exactly equal votes in proposal id " + proposal.id);
    }

    const percentageAsDecimal = parseFloat(winningOption) / 100
    const treasuryValuePrevious = params.value[0]
    const treasuryValueCurrent = params.value[1]
    const rawVoteAmount = treasuryValueCurrent * percentageAsDecimal;

    const delta = rawVoteAmount - treasuryValuePrevious;
    console.log("Raw vote amount and prev:", rawVoteAmount, treasuryValuePrevious)
    const data = await veUtils.callStatic.encodeTreasuryAllocationChangeCommand(parseEther(String(delta)))
    if (delta != 0) {
        return [{
            data: { cmdIndex: data[0].toString(), cmd: data[1] },
            stringOption: "Treasury Vote"
        }]
    }
    else {
        return [];
    }
}

async function getWinningVoteOption(proposal: Proposal): Promise<string | null | undefined> {
    console.log(proposal.scores_by_strategy);
    const maxScore = Math.max.apply(null, proposal.scores);
    if (maxScore == 0) {
        return null;
    }
    if (proposal.scores.filter((x) => x == maxScore).length != 1) {
        return undefined;
    }
    const maxIndex = proposal.scores.findIndex((x) => x == maxScore);


    return proposal.choices[maxIndex];
}