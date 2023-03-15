import { BigNumber, Contract, ethers } from "ethers";
import { readdirSync } from "fs";

function getStrategyHandler(): Contract {
    const rpcUrlMainnet = process.env.MAINNET_URL;

    const providerMainnet = new ethers.providers.JsonRpcProvider(rpcUrlMainnet);

    const abi = require("./curve-analytics/abis/mainnet/alluo/strategyHandler.json");
    const contractAddress = "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5";

    return new Contract(contractAddress, abi, providerMainnet);
}

async function main() {
    let myMap = new Map<number, string>();
    const path = "proposalOptions/liquidityDirectionOptions/";
    const options = readdirSync(path);
    let uniqueOptions: string[] = [];

    for (let i = 0; i < options.length; i++) {
        const relPath = "./../proposalOptions/liquidityDirectionOptions/"
        const optionFile = relPath + options[i];
        const optionsArray: string[] = require(optionFile);
        for (let j = 0; j < optionsArray.length; j++) {
            const option = optionsArray[j];
            if (!uniqueOptions.includes(option)) {
                uniqueOptions.push(option);
            }
        }
    }

    const sh = getStrategyHandler();
    for (let i = 0; i < uniqueOptions.length; i++) {
        const element = uniqueOptions[i].split(" - ")[0];
        const id: BigNumber = await sh.callStatic.directionNameToId(element);
        if (id.toNumber() == 0) {
            continue;
        }

        myMap.set(id.toNumber(), element);
    }

    console.log(myMap);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})