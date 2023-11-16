import { ethers } from "hardhat"
import https from "https";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { getTokenPrice } from "./coingeckoApi";
import { ibAlluoInfoPromise, ibAlluosInfo } from "./createProposals";
import { settings } from "./settings";
import { BigNumber } from "ethers";

export async function getTotalLiquidityDirectionValue(): Promise<number> {
    const mainnetProvider = new ethers.providers.JsonRpcProvider(settings.mainnetUrl);
    let strategyHandler = (await ethers.getContractAt("IStrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5")).connect(mainnetProvider);
    // let currentDeployed = await strategyHandler.getCurrentDeployed();
    let currentDeployed = [0, "125000000000000000000000", 0, 0];
    let totalValue = 0;
    let actions = [];

    for (let i = 0; i < currentDeployed.length; i++) {
        const action = async () => {
            let balance = currentDeployed[i];
            let balanceInNormal = Number(balance) / 10 ** 18;
            let primaryToken = await strategyHandler.getPrimaryTokenByAssetId(i, 1);
            let primaryTokenValue = await getTokenPrice(primaryToken, "ethereum");
            console.log("balanceInNormal", balanceInNormal)
            totalValue += balanceInNormal * primaryTokenValue;
        }
        actions.push(action());
    }

    await Promise.all(actions);
    return totalValue;
}

export async function getBufferAmountsPolygon(): Promise<number> {
    const polygonProvider = new ethers.providers.JsonRpcProvider(settings.polygonUrl);
    await ibAlluoInfoPromise;
    let ibAlluosPolygon = ibAlluosInfo.map(x => x.ibAlluoAddress);
    let totalValue = 0;
    let liquidityHandler = (await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1")).connect(polygonProvider);
    for (let i = 0; i < ibAlluosPolygon.length; i++) {
        let iballuo = (await ethers.getContractAt("IIbAlluo", ibAlluosPolygon[i])).connect(polygonProvider);
        let primaryToken = (await iballuo.getListSupportedTokens())[0]
        let balance = BigNumber.from(0);
        try {
            balance = await liquidityHandler.getAdapterAmount(ibAlluosPolygon[i]);

        } catch { }
        let balanceInNormal = Number(balance) / 10 ** 18;
        let primaryTokenValue = await getTokenPrice(primaryToken, "polygon-pos");

        console.log("balanceInNormal2", balanceInNormal)
        totalValue += balanceInNormal * primaryTokenValue;
    }
    return totalValue;
}


async function getTokenDecimals(tokenAddress: string): Promise<number> {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        return 18;
    }
    let tokenContract = await ethers.getContractAt("IERC20Metadata", tokenAddress)
    let decimals = await tokenContract.decimals()
    return decimals
}

