import { ibAlluosInfo } from "./createProposals";
import { settings } from "./settings";
import { getBufferAmountsPolygon, getTotalLiquidityDirectionValue } from "./getLiquidityDirectionValues";
import { calculateBoosterFunds, calculateTotalBalances, calculateUserFunds } from "./getTotalBalances";
import fs from 'fs';
import { getAPY } from "./liquidityDirectionApy";

export function getTreasuryInvestedProposalOptions() {
    return [
        '0%', '10%', '20%',
        '30%', '40%', '50%',
        '60%', '70%', '80%',
        '90%', '100%'
    ];
}

export async function getTreasuryValues() {
    let totalLiquidityDirectionValuePromise;
    let totalBufferValuePromise;
    let totalCustomerFundsPromise;
    if (!(settings.treasuryInvestedOverride) || !(settings.treasuryValueOverride)) {
        // Value of all liquidity direction locked on mainnet
        totalLiquidityDirectionValuePromise = getTotalLiquidityDirectionValue()

        // Value of all buffer funds on polygon
        totalBufferValuePromise = getBufferAmountsPolygon()

        // Subtract all user funds
        totalCustomerFundsPromise = calculateUserFunds()
    } else {
        console.log("Treasury values overridden, skipping requests");
    }

    let treasuryInvested = 0;
    if (settings.treasuryInvestedOverride) {
        console.log("Using treasury invested overridde");
        treasuryInvested = settings.treasuryInvestedOverride;
    } else {
        const [totalLiquidityDirectionValue, totalBufferValue, totalCustomerFunds] = await Promise.all([
            totalLiquidityDirectionValuePromise,
            totalBufferValuePromise,
            totalCustomerFundsPromise]);
        treasuryInvested = (totalLiquidityDirectionValue)! + (totalBufferValue)! - (totalCustomerFunds)!;
    }

    let treasuryValue = 0;
    if (settings.treasuryValueOverride) {
        console.log("Using treasury value override");
        treasuryValue = settings.treasuryValueOverride;
    } else {
        // Value of token balances as well as Alluo uniswapv3 pool position (only ETH part)
        let totalGnosisTokenBalancesPromise = calculateTotalBalances();

        // Value of all funds inside booster pools held by gnosis
        let boosterFundsValuePromise = calculateBoosterFunds("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");

        const [totalGnosisTokenBalances, boosterFundsValue, totalLiquidityDirectionValue, totalBufferValue, totalCustomerFunds] = await Promise.all([
            totalGnosisTokenBalancesPromise, ,
            boosterFundsValuePromise,
            totalLiquidityDirectionValuePromise,
            totalBufferValuePromise,
            totalCustomerFundsPromise
        ]);

        treasuryValue += totalGnosisTokenBalances
        treasuryValue += boosterFundsValue!
        treasuryValue += totalLiquidityDirectionValue
        treasuryValue += totalBufferValue!

        treasuryValue -= totalCustomerFunds!;
    }

    return { treasuryInvested, treasuryValue };
}

function replaceAll(str: string, find: string, replace: string) {
    var re = new RegExp(find, 'g');

    return str.replace(re, replace);
}

function getJson(optionsType: string, folder: string) {
    const voteDate = new Date();
    const regexFileString = `^\\d{2}-[A-Z][a-z]{2}-\\d{4}_${optionsType}\\.json$`
    const regexSpaces = /\d{2}\s[A-Z][a-z]{2}\s\d{4}/gm;
    const regexFile = new RegExp(regexFileString, "gm");
    const regexDate = /^\d{2}-[A-Z][a-z]{2}-\d{4}/gm;

    const baseDir = `./proposalOptions/${folder}`;
    let path = `${baseDir}/${replaceAll(voteDate.toUTCString().match(regexSpaces)![0], " ", "-")}_${optionsType}.json`;
    if (!fs.existsSync(path)) {
        // console.warn("Couldn't find file with options for vote stare date at", "'" + path + "',", "searching for latest file...");
        const files = fs.readdirSync(baseDir).filter((x) => x.match(regexFile) != null).sort((a: string, b: string) => {
            const dateA = Date.parse(a.match(regexDate)![0]);
            const dateB = Date.parse(b.match(regexDate)![0]);

            return dateB - dateA;
        });
        if (files.length == 0)
            throw new Error("Can't find any file with vote options.");
        path = `${baseDir}/${files[0]}`
        console.log("Found latest file:", "'" + path + "'");
    }
    else {
        console.log("Found file with options for today at", "'" + path + "'");
    }

    const json: any[] = require("../../" + path.replace('./', ''));
    console.log(json);
    return json;
}


export function getIbAlluoApyProposalOptions(asset: string) {
    const folder = "apyProposalOptions";
    const optionsType = `${folder}_${asset}`;
    return getJson(optionsType, folder);
}

export async function getLiquidityDirectionProposalOptions(asset: string) {
    const folder = "liquidityDirectionOptions";
    const optionsType = `${folder}_${asset}`;

    const ldOptions = getJson(optionsType, folder).map(async (x: string) => {
        let currentOption = x;
        let splittedOption = currentOption.split(" ");
        let llamaAPICode = splittedOption[splittedOption.length - 1];
        return await getAPY(currentOption, llamaAPICode)
    });
    
    const result = await Promise.all(ldOptions);

    console.log(asset, result);

    return result;
}