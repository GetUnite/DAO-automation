import { Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import fetch from 'node-fetch';
import { voteExecutorMasterAddressMainnet } from "./common";

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
    }[]
};

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
  proposals(where: {space_in: ["${space}"], end: ${voteFinishTime}}, orderBy: "created", orderDirection: desc) {
    id
    title
    body
    choices
    start
    end
    snapshot
    state
    scores
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

    if (!await timer.canExecute2WeekVote()) {
        console.log("Timer says that it is not time to create votes, exiting...");
        return;
    }
    console.log("Timer says that it is time to create votes");

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

    let todayFinishTime = (new Date().setUTCHours(voteEndHour, 0, 0, 0)) / 1000;
    if ((new Date().valueOf()) <= (todayFinishTime * 1000)) {
        throw new Error(`It is too early - expecting current time (${new Date().toUTCString()}) to be above ${new Date(todayFinishTime * 1000).toUTCString()}`);
    }
    console.log("Searching for all proposals in space", space, "that finished at timestamp", todayFinishTime, "(", new Date(todayFinishTime * 1000).toUTCString(), ")");

    const toExecute = await getAllProposals(hub, space, todayFinishTime);
    console.log(toExecute.length, "proposal(-s) to execute");

    let winningParams: {
        data: {
            cmdIndex: string;
            cmd: string;
        };
        stringOption: string;
    }[] = [];
    for (let i = 0; i < toExecute.length; i++) {
        const proposal = toExecute[i];
        const params = extractVoteParamsFromProposalBody(proposal)

        if (params == null) {
            console.log("Couldn't JSON in proposal body on proposal id " + proposal.id)
            console.log("Assuming that it is not executable, skipping...");
            continue;
        }

        const winningOption = getWinningVoteOption(proposal);

        if (winningOption === null) {
            throw new Error("Looks like noone voted on proposal id " + proposal.id);
        }
        if (winningOption === undefined) {
            throw new Error("There are votes that got exactly equal votes in proposal id " + proposal.id);
        }

        console.log(winningOption);

        const winningParam = params!.args.find((x) => x.stringOption == winningOption)!;
        winningParams.push(winningParam);
    }

    if (winningParams.length > 0) {
        const commandIndexes = winningParams.map((x) => Number.parseInt(x.data.cmdIndex));
        const commands = winningParams.map((x) => x.data.cmd);

        const mainnetProvider = new ethers.providers.JsonRpcProvider(process.env.NODE_URL as string);
        let signer = Wallet.fromMnemonic(process.env.MNEMONIC as string);
        signer = new Wallet(signer.privateKey, mainnetProvider);

        const veMasterInterface = await ethers.getContractAt("IVoteExecutorMaster", voteExecutorMasterAddressMainnet);
        const veMaster = new Contract(voteExecutorMasterAddressMainnet, veMasterInterface.interface, signer);

        console.log("Tx sender address:", signer.address)
        const cmdEncoded = await veMaster.callStatic.encodeAllMessages(commandIndexes, commands);

        console.log("Message hash:", cmdEncoded.messagesHash);
        console.log("Trying to broadcast tx...");
        const tx = await veMaster.submitData(cmdEncoded.inputData);

        console.log("Tx is broadcasted on chainId", (await ethers.provider.getNetwork()).chainId, "txHash:", tx.hash);
        console.log("Waiting for tx confirmation...");

        await tx.wait();
        console.log("Tx is confirmed");
    }
}

function getWinningVoteOption(proposal: Proposal): string | null | undefined {
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
