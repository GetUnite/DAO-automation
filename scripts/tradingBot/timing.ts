import { randomInRange } from "./tools";

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomExecutionPause(): number {
    const min = 1020; // 17 minute
    const max = 1920; // 32 minutes

    return randomInRange(min, max);
}

export function getRandomOppositeTradePause(): number {
    const min = 60; // 1 minute
    const max = 120; // 2 minutes

    return randomInRange(min, max);
}