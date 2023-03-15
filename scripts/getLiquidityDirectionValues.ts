import { ethers } from "hardhat"
import https from "https";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumber } from "ethers";
import { tickToPrice } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";


export async function getTotalLiquidityDirectionValue(): Promise<number> {
    await reset(process.env.NODE_URL)
    let strategyHandler = await ethers.getContractAt("IStrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5")
    let currentDeployed = await strategyHandler.getCurrentDeployed();
    let totalValue = 0;
    for (let i = 0; i < currentDeployed.length; i++) {
        let primaryToken = await strategyHandler.getPrimaryTokenByAssetId(i, 1);
        let balance = currentDeployed[i];
        let balanceInNormal = Number(balance) / 10 ** 18;
        let primaryTokenValue = await getTokenPrice(primaryToken, "ethereum");
        console.log("balanceInNormal", balanceInNormal)
        totalValue += balanceInNormal * primaryTokenValue;
    }
    return totalValue;
}

export async function getBufferAmountsPolygon(): Promise<number> {
    await reset(process.env.POLYGON_URL)
    let ibAlluosPolygon = [
        "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6", // usd
        "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92", // eur
        "0xc677B0918a96ad258A68785C2a3955428DeA7e50", // eth
        "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2", // btc
    ]
    let totalValue = 0;
    let liquidityHandler = await ethers.getContractAt("ILiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1")
    for (let i = 0; i < ibAlluosPolygon.length; i++) {
        let iballuo = await ethers.getContractAt("IIbAlluo", ibAlluosPolygon[i])
        let primaryToken = (await iballuo.getListSupportedTokens())[0]
        let balance = ethers.utils.parseUnits("0", await getTokenDecimals(primaryToken));
        try {
            balance = await liquidityHandler.getAdapterAmount(ibAlluosPolygon[i]);

        } catch { }
        let balanceInNormal = Number(balance) / 10 ** 18;
        let primaryTokenValue = await getTokenPrice(primaryToken, "polygon-pos");
        console.log("balanceInNormal", balanceInNormal)
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

async function getTokenPrice(tokenAddress: string, network: string): (Promise<number>) {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        tokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    }
    let url = `https://api.coingecko.com/api/v3/coins/${network}/contract/${tokenAddress}`;

    // Coingecko keeps rate limiting randomly.
    await delay(7000);
    return new Promise((resolve) => {
        https.get(url, (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
                data += chunk;
            });
            resp.on("end", () => {
                let price = JSON.parse(data).market_data.current_price.usd;
                resolve(price);
            });
        });
    })
}
const delay = (delayInms: number) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
}

