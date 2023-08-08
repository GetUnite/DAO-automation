import axios from "axios";
import { delay } from "./time";

let knownPrices: { [key: string]: number } = {};

// For debugging
export async function resetCache() {
    knownPrices = {};
}

export async function getTokenPrice(tokenAddress: string, network: string, throwOnApiError: boolean = false): (Promise<number>) {
    if (tokenAddress == "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE") {
        tokenAddress = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
    }
    else if (tokenAddress == "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f" && network == "polygon-pos") {
        // EURT doesnt have a price on polygon
        tokenAddress = "0xc581b735a1688071a1746c968e0798d642ede491"
        network = "ethereum"
    }
    let url = `https://api.coingecko.com/api/v3/coins/${network}/contract/${tokenAddress}`;

    let price = undefined;
    let retries = 0;
    while (price == undefined) {
        if (retries > 10) {
            throw new Error("Could not get price")
        }
        try {
            // Avoid concurrent requests
            if (knownPrices[tokenAddress] != undefined) {
                console.log(`Price for token ${tokenAddress} already known, returning cached value`);
                return knownPrices[tokenAddress];
            }

            console.log(`Requesting price for token ${tokenAddress} on ${network}`);
            const response = await axios.get(url);
            price = response.data.market_data.current_price.usd;
            knownPrices[tokenAddress] = price;
        } catch (err: any) {
            if (throwOnApiError) {
                throw err;
            }
            // Always retry on rate limit
            if (err.response && err.response.status == 429) {
                // Retry in short periods of time
                console.log(`Price request for token ${tokenAddress} on ${network} is rate limited, retrying in 5 seconds`);
                await delay(5000);

                continue;
            }
            console.log("Errored out, retrying");
            console.log(err);
            await delay(5000)
            retries += 1
        }
    }

    return price;
}