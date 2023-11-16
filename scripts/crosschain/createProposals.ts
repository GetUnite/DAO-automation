import { getIbAlluoApyProposalTopic, getLiquidityDirectionProposalTopic, getTreasuryInvestedProposalTopic } from "./proposalTitles";
import { getIbAlluoApyProposalBody, getLiquidityDirectionProposalBody, getTreasuryInvestedProposalBody } from "./proposalBodies";
import { getIbAlluoApyProposalOptions, getLiquidityDirectionProposalOptions, getTreasuryInvestedProposalOptions, getTreasuryValues } from "./proposalOptions";
import { createProposal } from "./snapshot";
import { Wallet } from "ethers";
import { ethers } from "hardhat";
import { settings } from "./settings";

export let ibAlluosInfo: { ibAlluoAddress: string, asset: string }[] = [];
export let ibAlluoInfoPromise: Promise<void>;

async function main() {
    const signer = Wallet.fromMnemonic(settings.mnemonic);
    const polygonProvider = new ethers.providers.JsonRpcProvider(settings.polygonUrl);

    // Fetch iballuo addresses and assets once
    const liquidityHandler = await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

    ibAlluoInfoPromise = (async () => {
        const ibAlluos = await liquidityHandler.connect(polygonProvider).getListOfIbAlluos();
        for (const ibAlluoAddress of ibAlluos) {
            const ibAlluo = await ethers.getContractAt("IIbAlluo", ibAlluoAddress);

            // asset is the last 3 characters of the ibAlluo symbol
            const symbol = await ibAlluo.connect(polygonProvider).symbol();
            const asset = symbol.slice(-3);
            // Fill assets array for LD proposals
            if (asset != "ETH") {
                ibAlluosInfo.push({ asset, ibAlluoAddress });
            }
        }
    })()


    /////////////////////////////
    // Treasury invested proposal
    const treasuryTopic = getTreasuryInvestedProposalTopic();
    const treasuryOptions = getTreasuryInvestedProposalOptions();

    // Override values will be set by this function if they are not undefined
    const { treasuryInvested, treasuryValue } = await getTreasuryValues();

    const treasuryBody = getTreasuryInvestedProposalBody(treasuryInvested, treasuryValue, treasuryOptions);
    // console.log(treasuryBody)
    await createProposal(treasuryTopic, treasuryBody, treasuryOptions, signer);


    /////////////////////////
    // ibAlluos APY proposals -- TODO: need cmd encoding from VE
    await ibAlluoInfoPromise;
    for (const info of ibAlluosInfo) {
        const topic = getIbAlluoApyProposalTopic(info.asset);
        const options = getIbAlluoApyProposalOptions(info.asset);
        const body = await getIbAlluoApyProposalBody(info.asset, options);

        await createProposal(topic, body, options.map(x => `${x}% APY`), signer);
    }

    ////////////////////////////////
    // Liquidity Direction proposals
    for (const info of ibAlluosInfo) {
        const topic = getLiquidityDirectionProposalTopic(info.asset);
        const options = await getLiquidityDirectionProposalOptions(info.asset);
        const body = getLiquidityDirectionProposalBody(info.asset, options);
        // console.log(options)
        await createProposal(topic, body, options, signer);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});