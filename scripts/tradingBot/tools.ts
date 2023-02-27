import { delay } from "./timing";

export function randomInRange(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
};

export async function executeWithTimeout(action: () => Promise<boolean>, timeoutMs: number): Promise<boolean> {
    const timeoutAction = async () => {
        await delay(timeoutMs);
        return false;
    }
    return await Promise.race([action(), timeoutAction()])
}