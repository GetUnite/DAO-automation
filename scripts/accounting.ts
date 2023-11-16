import { settings } from "./crosschain/settings";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { getTokenPrice } from "./crosschain/coingeckoApi";
import { ethers } from "hardhat";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
const axios = require('axios'); // Ensure you have axios installed

function getLastDayOfMonthTimestamps(year: number) {
    let timestamps = [];
    for (let month = 0; month < 12; month++) {
        // Create a date object for the first day of the next month
        let date = new Date(year, month + 1, 1);
        // Subtract one second to get the last moment of the current month
        date.setSeconds(date.getSeconds() - 1);
        // Convert to UNIX timestamp and add to the array
        timestamps.push(Math.floor(date.getTime() / 1000));
    }
    return timestamps;
}

async function getBlockNumbersForTimestamps(timestamps: number[]) {
    let blockNumbers = [];
    for (let timestamp of timestamps) {
        // Replace with an actual API call to fetch the block number
        let blockNumber = await fetchBlockNumberForTimestamp(timestamp);
        blockNumbers.push(blockNumber);
    }
    return blockNumbers;
}

async function fetchBlockNumberForTimestamp(timestamp: number, apiKey = "91TXHS2YKKH6V47VCQ1VU2PRHV293F6TZX") {
    const url = `https://api.polygonscan.com/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before&apikey=${apiKey}`;
    try {
        const response = await axios.get(url);
        return response.data.result; // Assuming the block number is returned in 'result'
    } catch (error) {
        console.error('Error fetching block number:', error);
        throw error;
    }
}

export async function calculateUserFunds(blockNumbers: number[], timestamps: number[]): Promise<any> {
    let results: any = {}; // Object to store the results

    for (let blockNumber of blockNumbers) {
        console.log("blockNumber", blockNumber)
        await reset(settings.polygonUrl, blockNumber);

        let iballuoAddresses = ["0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92", "0xc677B0918a96ad258A68785C2a3955428DeA7e50", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2"];
        let timestamp = timestamps[blockNumbers.indexOf(blockNumber)];
        if (!results[timestamp]) {
            results[timestamp] = {}; // Initialize if not already existing
        }

        for (let iballuoAddress of iballuoAddresses) {
            let iballuo = (await ethers.getContractAt("IIbAlluo", iballuoAddress))
            // Parralel requests
            let totalValueLocked = await iballuo.totalAssetSupply();
            let gnosisBalance = await iballuo.balanceOf("0x2580f9954529853ca5ac5543ce39e9b5b1145135");
            let superToken = await iballuo.superToken();
            let streamableTokenPromise = ethers.getContractAt("IStIbAlluo", superToken);
            let primaryTokensPromise = iballuo.getListSupportedTokens();
            let ibAlluoNamePromise = iballuo.name();

            let primaryToken = (await primaryTokensPromise)[0];
            let primaryTokenPrice = await getTokenPrice(primaryToken, "polygon-pos");

            const streamableToken = (await streamableTokenPromise)
            let gnosisBalanceStreamable = await streamableToken.realtimeBalanceOfNow("0x2580f9954529853ca5ac5543ce39e9b5b1145135");
            let valueHeldByGnosis = await iballuo.convertToAssetValue(gnosisBalance);

            let gnosisValueStreamable = await iballuo.convertToAssetValue(gnosisBalanceStreamable.availableBalance);
            let stiballuoDoubleCount = await iballuo.convertToAssetValue(await iballuo.balanceOf(streamableToken.address))
            let totalIbAlluoCustomerFunds = Number(totalValueLocked) - Number(valueHeldByGnosis) - Number(stiballuoDoubleCount)
            // console.log("total iballuo customer funds", (totalIbAlluoCustomerFunds))
            let stiballuoTVL = await streamableToken.totalSupply();
            let totalStIbAlluoCustomerFunds = Number(await iballuo.convertToAssetValue(stiballuoTVL)) - Number(gnosisValueStreamable);
            // console.log("total stiballuo customer funds", (totalStIbAlluoCustomerFunds));
            let totalAssetCustomerFunds = totalIbAlluoCustomerFunds + totalStIbAlluoCustomerFunds;
            console.log("IbAlluo:", await ibAlluoNamePromise, "Total asset customer funds:", totalAssetCustomerFunds / (10 ** 18));
            let ibAlluoName = await iballuo.name();

            results[timestamp][ibAlluoName] = totalAssetCustomerFunds / (10 ** 18);

        }
    }
    return results;
}
const fs = require('fs'); // Node.js file system module
function saveResultsToFile(filename: string, results: any) {
    fs.writeFile(filename, JSON.stringify(results, null, 2), 'utf8', function (err: any) {
        if (err) {
            console.log('An error occurred while writing JSON to the file.');
            console.log(err);
        } else {
            console.log('JSON file has been saved.');
        }
    });
}

async function main() {
    let yearOfInterest = 2023;
    let timestamps = getLastDayOfMonthTimestamps(yearOfInterest);
    let blockNumbers = await getBlockNumbersForTimestamps(timestamps);
    // Convert array to numbers
    blockNumbers = blockNumbers.map(Number);
    // Remove any NANs
    blockNumbers = blockNumbers.filter((x) => !isNaN(x));
    console.log(blockNumbers);
    // scale timestamps to the same length as blocknumbers
    timestamps = timestamps.slice(0, blockNumbers.length);
    let results = await calculateUserFunds(blockNumbers, timestamps);

    saveResultsToFile('results.json', results);


}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});