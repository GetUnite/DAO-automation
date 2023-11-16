import { settings } from "./crosschain/settings";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { getTokenPrice } from "./crosschain/coingeckoApi";
import { ethers } from "hardhat";

export async function getOptimismLDValue() {
    const alluoStrategyHandlerAddress = "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29";
    const optimismProvider = new ethers.providers.JsonRpcProvider(settings.optimismUrl);

    const alluoStrategyHandler = (await ethers.getContractAt("IAlluoStrategyHandler", alluoStrategyHandlerAddress)).connect(optimismProvider);
    const priceRouter = (await ethers.getContractAt("IPriceRouter", "0x7E6FD319A856A210b9957Cd6490306995830aD25")).connect(optimismProvider);

    const numberOfAssets = await alluoStrategyHandler.numberOfAssets();
    let sum: number = 0;

    const actions = [];
    for (let i = 0; i < numberOfAssets; i++) {
        const action = async () => {
            const tokenAddress = await alluoStrategyHandler.getPrimaryTokenForAsset(i);

            if (tokenAddress == ethers.constants.AddressZero) {
                return;
            }

            const token = (await ethers.getContractAt("IERC20Metadata", tokenAddress)).connect(optimismProvider);
            const deployedAmount = await alluoStrategyHandler.markAssetToMarket(i);

            if (deployedAmount.isZero()) {
                // console.log("Nothing for", await token.symbol())
                return;
            }

            const decimalsDiff = 18 - await token.decimals();
            const amountOriginalDecimals = deployedAmount.div(BigNumber.from(10).pow(decimalsDiff));

            const query = await priceRouter["getPriceOfAmount(address,uint256,string)"](tokenAddress, amountOriginalDecimals, "USD");
            const usdPrice = Number.parseFloat(formatUnits(query.value, query.decimals));

            sum += usdPrice;

            // console.log(await token.symbol(), "Amount:", formatUnits(amountOriginalDecimals.toString(), await token.decimals()), "USD:", usdPrice);
        }
        actions.push(action());
    }
    await Promise.all(actions);

    // console.log("Total:", sum, "USD");
    return sum;
}

export async function getGnosisSdaiPositon() {
    const sdaiAddress = "0x83F20F44975D03b1b09e64809B757c47f942BEeA";
    const gnosisAddress = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    const mainnetProvider = new ethers.providers.JsonRpcProvider(settings.mainnetUrl);
    const sdai = (await ethers.getContractAt("ISavingsDai", sdaiAddress)).connect(mainnetProvider);
    const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

    const maxWithdrawRaw = await sdai.maxWithdraw(gnosisAddress);

    if (maxWithdrawRaw.isZero()) {
        return 0;
    }

    // we received dai amount
    const maxWithdraw = Number.parseFloat(formatUnits(maxWithdrawRaw, 18));
    const daiPrice = await getTokenPrice(daiAddress, "ethereum");

    return maxWithdraw * daiPrice;
}

export async function getGnosisUSDTopYearnVaultPosition() {
    const optimismProvider = new ethers.providers.JsonRpcProvider(settings.optimismUrl);
    const yearnUsdTopVaultAddress = "0x306Df6b5D50abeD3f7bCbe7399C4b8e6BD55cB81";
    const vault = (await ethers.getContractAt("IAlluoOmnivault", yearnUsdTopVaultAddress)).connect(optimismProvider);
    const usdcAddress = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    const gnosisAddress = "0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4";

    const usdcAmountRaw = await vault.callStatic.withdraw(usdcAddress, 10000, { from: gnosisAddress });
    const usdcAmount = Number.parseFloat(formatUnits(usdcAmountRaw, 6));
    const usdcPrice = await getTokenPrice(usdcAddress, "optimistic-ethereum");


    return usdcAmount * usdcPrice;
}

async function main() {
    // console.log("Optimism LD value:", await getOptimismLDValue());
    console.log("Gnosis SDAI position:", await getGnosisSdaiPositon());
    // console.log("Gnosis USD top yearn vault position:", await getGnosisUSDTopYearnVaultPosition());
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});