import * as lambda from "./curve-analytics/index";

async function main() {
    const res = await lambda.lambdaMain({});
    if (res.statusCode != 200) {
        throw res.body;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})