let prepand: string = "";
export function print(level: string, message: string) {
    console.log(level, "[" + new Date().toUTCString() + "]", prepand, message);
}

export function log(message: string) {
    print("INFO:   ", message)
}

export function error(message: string) {
    print("ERROR:  ", message)
}

export function warning(message: string) {
    print("WARNING:", message)
}

export function setPrepand(newPrepand: string) {
    prepand = newPrepand;
}

export function getPrepand(): string {
    return prepand;
}