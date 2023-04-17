import { BigNumber, Contract, Wallet } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import fetch from 'node-fetch';
import { voteExecutorMasterAddressMainnet, voteExecutorMasterAddress } from "./common";



type Proposal = {
    id: string,
    title: string,
    body: string,
    choices: string[],
    start: number,
    end: number,
    snapshot: string,
    state: string,
    scores: number[],
    scores_by_strategy: number[][]
    author: string,
    space: {
        id: string,
        name: string
    }
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

type winningParam = {
    data: {
        cmdIndex: string;
        cmd: string;
    };
    stringOption: string;
}

function extractVoteParamsFromProposalBody(proposal: Proposal): VoteParams | null {
    const regex = /\`\`\`json.*\`\`\`/gs;
    const match = proposal.body.match(regex);
    if (match != null) {
        const res = match![0].substring(8, match![0].length - 3);

        return JSON.parse(res) as VoteParams;
    }
    else {
        return null;
    }
}

async function getAllProposals(hub: string, space: string, voteFinishTime: number): Promise<Proposal[]> {
    const query = `
{
  proposals(where: {space_in: ["${space}"], end_gt: ${voteFinishTime}, author: "${process.env.PUBLIC_ADDRESS}"}, orderBy: "created", orderDirection: desc) {
    id
    title
    body
    choices
    start
    end
    snapshot
    state
    scores
    scores_by_strategy
    author
    space {
      id
      name
    }
  }
}
`;
    const payload = {
        "query": query,
        "variables": null
    }
    const response = await fetch(hub, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(await response.text());
    }
    else {
        return (await response.json()).data.proposals as Proposal[];
    }
}

async function main() {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const voteEndHour = Number.parseInt(process.env.APY_VOTE_END_HOUR as string);
    const timerProvider = ethers.getDefaultProvider(process.env.POLYGON_URL as string);

    let timerInterface = (await ethers.getContractAt("VoteTimer", voteExecutorMasterAddressMainnet)).interface;
    let timer = new Contract("0x67578893643F6670a28AeF244F3Cd4d8257A4c7b", timerInterface, timerProvider);

    // Enable only for tests
    // const veMasterInterface = await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddress);

    const veMasterInterface = await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddressMainnet);

    // if (!await timer.canExecute2WeekVote()) {
    //     console.log("Timer says that it is not time to execute votes, exiting...");
    //     return;
    // }

    console.log("Timer says that it is time to execute votes");

    let hub = "https://hub.snapshot.org/graphql";
    let space = "alluo.eth";
    if (chainId != 1) {
        console.log("Using testnet hub and space");
        hub = "https://testnet.snapshot.org/graphql";
        space = "0xtuytuy.eth";
    }
    else {
        console.log("Using mainnet hub and space");
    }

    // Only for tests
    // hub = "https://testnet.snapshot.org/graphql";
    // space = "0xtuytuy.eth";

    let todayFinishTime = (new Date().setUTCHours(voteEndHour, 0, 0, 0)) / 1000;

    if ((new Date().valueOf()) <= (todayFinishTime * 1000)) {
        throw new Error(`It is too early - expecting current time (${new Date().toUTCString()}) to be above ${new Date(todayFinishTime * 1000).toUTCString()}`);
    }
    console.log("Searching for all proposals in space", space, "that finished at timestamp", todayFinishTime, "(", new Date(todayFinishTime * 1000).toUTCString(), ")");

    const toExecute = await getAllProposals(hub, space, todayFinishTime);
    console.log(toExecute.length, "proposal(-s) to execute");

    let winningParams: winningParam[] = [];

    const mainnetProvider = new ethers.providers.JsonRpcProvider(process.env.NODE_URL as string);
    let signer = Wallet.fromMnemonic(process.env.MNEMONIC as string);
    signer = new Wallet(signer.privateKey, mainnetProvider);

    // Enable only for tests
    // const veMaster = new Contract(voteExecutorMasterAddress, veMasterInterface.interface, signer);
    const veMaster = new Contract(voteExecutorMasterAddressMainnet, veMasterInterface.interface, signer);


    for (let i = 0; i < toExecute.length; i++) {
        const proposal = toExecute[i];
        const params = extractVoteParamsFromProposalBody(proposal)

        if (params == null) {
            console.log("Couldn't JSON in proposal body on proposal id " + proposal.id)
            console.log("Assuming that it is not executable, skipping...");
            continue;
        }
        if (params.type == "Liquidity Direction Vote") {
            const winningDataArray = await getLiquidityDirectionData(proposal, params);
            if (winningDataArray === null || winningDataArray == undefined) {
                throw new Error("Error " + proposal.id);
            }
            if (typeof winningDataArray == "string") {
                console.log("Do nothing vote in proposal id " + proposal.id);
                continue;
            } else {
                winningParams = winningParams.concat(winningDataArray);
            }

        } else {
            const winningOption = await getWinningVoteOption(proposal, params);

            if (winningOption === null) {
                throw new Error("Looks like noone voted on proposal id " + proposal.id);
            }
            if (winningOption === undefined) {
                throw new Error("There are votes that got exactly equal votes in proposal id " + proposal.id);
            }

            console.log(winningOption);
            if (params.type == "Treasury Vote") {
                const percentageAsDecimal = parseFloat(winningOption) / 100
                const treasuryValuePrevious = params.value[0]
                const treasuryValueCurrent = params.value[1]
                const rawVoteAmount = treasuryValueCurrent * percentageAsDecimal;

                const delta = rawVoteAmount - treasuryValuePrevious;
                console.log("Raw vote amount and prev:", rawVoteAmount, treasuryValuePrevious)
                const data = await veMaster.callStatic.encodeTreasuryAllocationChangeCommand(parseEther(String(delta)))
                if (delta != 0) {
                    winningParams.push({ data: { cmdIndex: data[0].toString(), cmd: data[1] }, stringOption: "Treasury Vote" })
                }

            } else {
                const winningParam = params!.args.find((x) => x.stringOption == winningOption)!;
                if (!(winningParam.stringOption == '0 $ALLUO - 0% APR')) {
                    winningParams.push(winningParam);
                }
            }

        }
    }

    if (winningParams.length > 0) {
        const commandIndexes = winningParams.map((x) => Number.parseInt(x.data.cmdIndex));
        const commands = winningParams.map((x) => x.data.cmd);
        console.log("winning params", winningParams)
        console.log("Tx sender address:", signer.address)
        const cmdEncoded = await veMaster.callStatic.encodeAllMessages(commandIndexes, commands);

        console.log("Message hash:", cmdEncoded.messagesHash);
        console.log("Trying to broadcast tx...");
        console.log(cmdEncoded)
        const tx = await veMaster.submitData(cmdEncoded.inputData);

        console.log("Tx is broadcasted on chainId", (await ethers.provider.getNetwork()).chainId, "txHash:", tx.hash);
        console.log("Waiting for tx confirmation...");

        await tx.wait();
        console.log("Tx is confirmed");
    }
}

async function getWinningVoteOption(proposal: Proposal, params: VoteParams): Promise<string | null | undefined> {
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
async function getLiquidityDirectionData(proposal: Proposal, params: VoteParams): Promise<winningParam[] | null | undefined | string> {
    let winningParams: winningParam[] = []

    const mainnetProvider = new ethers.providers.JsonRpcProvider(process.env.NODE_URL as string);
    let signer = Wallet.fromMnemonic(process.env.MNEMONIC as string);
    signer = new Wallet(signer.privateKey, mainnetProvider);

    // Enable below only for tests
    // const veMasterInterface = await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddress);
    // const veMaster = new Contract(voteExecutorMasterAddress, veMasterInterface.interface, signer);

    const veMasterInterface = await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddressMainnet);
    const veMaster = new Contract(voteExecutorMasterAddressMainnet, veMasterInterface.interface, signer);

    const strategyHandlerAddress = "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5"
    const strategyHandlerContract = await ethers.getContractAt("IStrategyHandler", strategyHandlerAddress);
    const strategyHandler = new Contract(strategyHandlerAddress, strategyHandlerContract.interface, signer);
    const activeStrategies = await strategyHandler.callStatic.getAllAssetActiveIds();
    let activeNumStrategies: Number[] = []
    // Some strange behaviour with array of bignumbers. So here I cast to num.
    activeStrategies.forEach((num: BigNumber) => {
        activeNumStrategies.push(Number(num))
    });
    console.log("Current active strategies nums", activeNumStrategies)


    // Replace all votes with less than 5% with 0.
    const totalVotesCasted = proposal.scores.reduce((previousValue, currentValue) => previousValue + currentValue)
    proposal.scores = proposal.scores.map((score: number) => { return score < totalVotesCasted * 0.05 ? 0 : score; });
    const newTotalVotesCasted = proposal.scores.reduce((previousValue, currentValue) => previousValue + currentValue)

    for (let i = 0; i < proposal.scores.length; i++) {
        // if (proposal.scores[i] == 0) {continue}
        // If previously 0 and new == 0, then skip (if deployedAmount = 0 and scores ==0) 
        // If previously non zero and new == 0, then add it.
        if (proposal.scores.length == 1 && proposal.choices[i] == "Do nothing") {
            return "Do nothing";
        }
        let commandKeyWord = proposal.choices[i].split(" ").slice(0, 2).join(" ");

        console.log("CommandKeyword:", commandKeyWord)
        const directionId = Number(await strategyHandler.callStatic.getDirectionIdByName(commandKeyWord));
        console.log("Current directionId", directionId)
        if (proposal.scores[i] == 0 && !activeNumStrategies.includes(directionId)) {
            console.log("Ignoring this vote...")
            continue
        }
        const percentage = proposal.scores[i] / newTotalVotesCasted * 10000
        console.log("Percentage:", percentage.toFixed(0), "commandKeyword", commandKeyWord)

        const data = await veMaster.callStatic.encodeLiquidityCommand(commandKeyWord, percentage.toFixed(0));
        winningParams.push({ data: { cmdIndex: data[0].toString(), cmd: data[1] }, stringOption: commandKeyWord })
    }
    return winningParams
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
