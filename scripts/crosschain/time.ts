import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

export function getTimestampNow() {
    dayjs.extend(utc);

    return dayjs.utc().unix();
}

// This function returns the timestamp of the next Sunday at 12:00 UTC
// If fromTimestamp is provided, it will return the next Sunday at 12:00 UTC from that timestamp
// If fromTimestamp is not provided, it will return the next Sunday at 12:00 UTC from the current timestamp
//
// Examples:
// 2023-07-28 Fri 16:28 -> 2023-07-30 Sun 16:00 (same week)
// 2023-07-30 Sun 16:28 -> 2023-08-06 Sun 16:00 (next week)
// 2023-07-30 Sun 08:26 -> 2023-07-30 Sun 16:00 (same day)
export function getVoteEndTimestamp(fromTimestamp?: number) {
    dayjs.extend(utc);

    // Uncomment for overrides
    // return 1691424900;

    let timestampNow = dayjs.utc();
    if (fromTimestamp) {
        timestampNow = dayjs.utc(fromTimestamp * 1000);
    }

    // 12:00 UTC
    let voteTime = timestampNow.hour(12).minute(0).second(0);

    // loop while voteTime is not Sunday
    while (voteTime.day() != 0 || !(timestampNow.isBefore(voteTime))) {
        voteTime = voteTime.add(1, "day");
    }

    return voteTime.unix();
}

export function getFinishedVoteEndTimestamp(fromTimestamp?: number) {
    dayjs.extend(utc);

    // // Uncomment for overrides
    // return 1691424900;

    let timestampNow = dayjs.utc();
    if (fromTimestamp) {
        timestampNow = dayjs.utc(fromTimestamp! * 1000);
    }

    // 12:00 UTC
    let voteTime = timestampNow.hour(12).minute(0).second(0);

    // loop while voteTime is not Sunday
    while (voteTime.day() != 0 || !(voteTime.isBefore(timestampNow))) {
        voteTime = voteTime.subtract(1, "day");
    }

    return voteTime.unix();
}

// This function returns the timestamp of the time when vote effect starts
export function getEffectStartTimestamp(fromTimestamp?: number) {
    // // Uncomment for overrides
    // return 1691323200;

    // Assume that the effect starts right after the vote ends
    return getVoteEndTimestamp(fromTimestamp);
}

// This function returns the timestamp of the time when vote effect ends
export function getEffectEndTimestamp(fromTimestamp?: number) {
    // // Uncomment for overrides
    // return 1692532800;

    // Effect ends in 14 days since the vote ends
    const voteEndTimestamp = getVoteEndTimestamp(fromTimestamp);
    return dayjs.unix(voteEndTimestamp).add(14, "day").unix();
}

export const delay = (delayInms: number) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
}