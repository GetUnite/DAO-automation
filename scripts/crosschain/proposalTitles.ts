import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { getEffectEndTimestamp, getEffectStartTimestamp } from "./time";

function UTCStringToRemiString(utcString: string): string {
    const regex = /\d{2}\s[A-Z][a-z]{2}\s\d{4}/gm;
    return utcString.match(regex)![0]
        .replace(/\s/, "-")
        .replace(/\s/, "-")
        .replace("Jan", "January")
        .replace("Feb", "February")
        .replace("Mar", "March")
        .replace("Apr", "April")
        .replace("Jun", "June")
        .replace("Jul", "July")
        .replace("Aug", "August")
        .replace("Sep", "September")
        .replace("Oct", "October")
        .replace("Nov", "November")
        .replace("Dec", "December");
}

export function getTreasuryInvestedProposalTopic(
    effectStartTimestamp: number = getEffectStartTimestamp(),
    effectEndTimestamp: number = getEffectEndTimestamp()
) {
    dayjs.extend(utc);

    const effectStartTimestampString = UTCStringToRemiString(dayjs.unix(effectStartTimestamp).utc().toString());
    const effectEndTimestampString = UTCStringToRemiString(dayjs.unix(effectEndTimestamp).utc().toString());

    return `Percentage of treasury invested: ${effectStartTimestampString} to ${effectEndTimestampString}`;
}

export function getLiquidityDirectionProposalTopic(
    asset: string,
    effectStartTimestamp: number = getEffectStartTimestamp(),
    effectEndTimestamp: number = getEffectEndTimestamp()
) {
    const effectStartTimestampString = UTCStringToRemiString(dayjs.unix(effectStartTimestamp).utc().toString());
    const effectEndTimestampString = UTCStringToRemiString(dayjs.unix(effectEndTimestamp).utc().toString());

    return `[${asset}] Liquidity direction: ${effectStartTimestampString} to ${effectEndTimestampString}`;
}

export function getIbAlluoApyProposalTopic(
    asset: string,
    effectStartTimestamp: number = getEffectStartTimestamp(),
    effectEndTimestamp: number = getEffectEndTimestamp()
) {
    const effectStartTimestampString = UTCStringToRemiString(dayjs.unix(effectStartTimestamp).utc().toString());
    const effectEndTimestampString = UTCStringToRemiString(dayjs.unix(effectEndTimestamp).utc().toString());

    return `Advertised APY for the ${asset} pool: ${effectStartTimestampString} to ${effectEndTimestampString}`;
}