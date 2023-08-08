import { Wallet } from "ethers";
import { settings } from "./settings";
import snapshot from "@snapshot-labs/snapshot.js";
import { getFinishedVoteEndTimestamp, getTimestampNow, getVoteEndTimestamp } from "./time";
import { ethers } from "hardhat";

export type Proposal = {
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

export async function createProposal(
    title: string,
    body: string,
    options: string[],
    signer: Wallet,
    type: string = "quadratic",
    blockSnapshot?: number,
) {
    // Testnet snapshot: https://demo.snapshot.org/
    const hub = settings.testnet ? "https://testnet.snapshot.org" : "https://hub.snapshot.org";
    const space = settings.testnet ? settings.testnetSpace : "alluo.eth";
    const discussion = "https://discord.com/invite/alluo";
    const plugins = JSON.stringify({});
    const timestampNow = getTimestampNow();
    const timestampEnd = getVoteEndTimestamp();

    if (space == undefined) {
        throw new Error("testnetSpace is undefined");
    }

    if (settings.testnet && blockSnapshot == undefined) {
        const goerliProvider = new ethers.providers.JsonRpcProvider(settings.testnetUrl);
        blockSnapshot = await goerliProvider.getBlockNumber();
    } else if (blockSnapshot == undefined) {
        const mainnetProvider = new ethers.providers.JsonRpcProvider(settings.mainnetUrl);
        blockSnapshot = await mainnetProvider.getBlockNumber();
    } 
    // Randomly getting errors from snapshot that block doesn't exist
    blockSnapshot -= 2

    const client = new snapshot.Client712(hub);
    const vote = {
        from: signer.address,
        space: space,
        timestamp: timestampNow,
        type: type,
        title: title,
        body: body,
        discussion: discussion,
        choices: options,
        start: timestampNow,
        end: timestampEnd,
        snapshot: blockSnapshot,
        plugins: plugins
    };

    await client.proposal(signer, signer.address, vote);
}

export async function getProposals(
    signer: Wallet
) {
    const hub = settings.testnet ? "https://testnet.snapshot.org/graphql" : "https://hub.snapshot.org/graphql";
    const space = settings.testnet ? settings.testnetSpace : "alluo.eth";
    const timestamp = getFinishedVoteEndTimestamp();

    const query = `
    {
      proposals(where: {space_in: ["${space}"], end: ${timestamp}, author: "${signer.address}"}, orderBy: "created", orderDirection: desc) {
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

export function extractVoteParamsFromProposalBody(proposal: Proposal): VoteParams | null {
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