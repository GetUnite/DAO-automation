import { getOptimisedFarmInterest } from "./omnivaultApy";

export async function getAPY(voteOption: string, llamaAPICode: string): Promise<string> {
    let estimatedFactorAbove = 0;
    if (voteOption == "Do nothing") {
        return voteOption;
    }
    if (llamaAPICode.split("-")[0] == "HISTORICAL") {
        throw new Error("Not implemented")
        // let final2WeekAPR = await getHistoricalAPY(voteOption, llamaAPICode)
        // return formatVoteOption(final2WeekAPR.toString(), voteOption);
    }

    if (llamaAPICode.split("-")[0] == "YEARN" || llamaAPICode.split("-")[0] == "BEEFY") {
        let apy = await getOptimisedFarmInterest(llamaAPICode.split("-")[1], llamaAPICode.split("-")[0]);
        // console.log(apy, "apy")
        // console.log(voteOption, "vote option")
        return formatVoteOption(apy.toString(), voteOption);
    }

    else if (llamaAPICode.length > 36) {
        // Estimated margin from FraxConvex yield above convexfinance yields
        let splitted = llamaAPICode.split("-")
        estimatedFactorAbove = Number(splitted[splitted.length - 1]);
        llamaAPICode = llamaAPICode.slice(0, -5)
    }

    let requestURL = "https://yields.llama.fi/chart/" + llamaAPICode;
    try {
        const response = await fetch(requestURL);
        const data = await response.json();
        let latestData = data.data[data.data.length - 1];
        let latestAPY = latestData["apy"] + estimatedFactorAbove;
        return formatVoteOption(latestAPY.toString(), voteOption);
    } catch (error) {
        console.error(error);
        return String(error);
    }
}

function formatVoteOption(latestAPY: string, voteOption: string): string {
    let latestAPY2DP = Number(latestAPY).toFixed(2);
    let splittedOption = voteOption.split(" ");
    splittedOption.pop();
    voteOption = splittedOption.join(" ");
    voteOption += " " + latestAPY2DP + "%";
    return voteOption;
}