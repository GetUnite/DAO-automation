import { ethers } from "hardhat";
import { settings } from "./settings";
import { extractVoteParamsFromProposalBody, getProposals } from "./snapshot";
import { Wallet } from "ethers";
import { processAPYProposal, processLDProposal, processTreasuryProposal, winningParam } from "./processSettledProposals";
import { formatEther } from "ethers/lib/utils";

async function main() {
    const wallet = Wallet.fromMnemonic(settings.mnemonic);

    const proposals = await getProposals(wallet);
    console.log(proposals.length, "proposal(-s) to execute");
    console.log("Proposals: ", proposals.map((p) => p.title));

    let winningParams: winningParam[] = [];

    for (let i = 0; i < proposals.length; i++) {
        const proposal = proposals[i];
        const params = extractVoteParamsFromProposalBody(proposal);

        if (params == null) {
            console.log("Couldn't JSON in proposal body on proposal id " + proposal.id)
            console.log("Assuming that it is not executable, skipping...");
            continue;
        }

        switch (params.type) {
            case "Liquidity Direction Vote":
                console.log("Processing Liquidity Direction Vote proposal");
                winningParams.push(...await processLDProposal(proposal, params));
                break;

            case "apyProposal":
                console.log("Processing APY proposal");
                winningParams.push(...await processAPYProposal(proposal, params));
                break;

            case "Treasury Vote":
                console.log("Processing Treasury Vote proposal");
                winningParams.push(...await processTreasuryProposal(proposal, params));
                break;

            default:
                throw new Error("Unknown proposal type");
        }
    }

    const optimismProvider = new ethers.providers.JsonRpcProvider(settings.optimismUrl);
    const signer = Wallet.fromMnemonic(settings.mnemonic).connect(optimismProvider);

    if (winningParams.length > 0) {
        const veMaster = (await ethers.getContractAt("IVoteExecutorMaster", settings.voteExecutorMasterAddress)).connect(optimismProvider);
        const veUtils = (await ethers.getContractAt("IVoteExecutorMasterUtils", settings.voteExecutorUtilsAddress)).connect(optimismProvider);

        const commandIndexes = winningParams.map((x) => Number.parseInt(x.data.cmdIndex));
        const commands = winningParams.map((x) => x.data.cmd);
        console.log("winning params", winningParams)
        console.log("Tx sender address:", signer.address)
        console.log("Tx sender balance:", formatEther(await signer.getBalance()));
        const cmdEncoded = await veUtils.callStatic.encodeAllMessages(commandIndexes, commands);

        console.log("Message hash:", cmdEncoded.messagesHash);
        console.log("Trying to broadcast tx...");
        const tx = await veMaster.connect(signer).submitData(cmdEncoded.inputData, {gasLimit: 2000000});

        console.log("Tx is broadcasted on chainId", (await ethers.provider.getNetwork()).chainId, "txHash:", tx.hash);
        console.log("Waiting for tx confirmation...");

        await tx.wait();
        console.log("Tx is confirmed");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});