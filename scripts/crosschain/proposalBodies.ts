import { ethers } from "hardhat";
import { settings } from "./settings";

function numberWithCommas(x: string) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function getAnnualInterestParam(apyPercent: number): number {
    return Math.round(apyPercent * 100);
}

function getInterestPerSecondParam(apyPercent: number): string {
    const secondsInYear = 31536000;
    const decimalApy = 1 + (apyPercent / 100);
    const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
    return Math.round(decimalInterest * (10 ** 17)).toString();
}

export function getTreasuryInvestedProposalBody(treasuryInvested: number, treasuryValue: number, options: string[]) {
    const json = {
        "type": "Treasury Vote",
        "args": options,
        "value": [
            treasuryInvested.toFixed(0),
            treasuryValue.toFixed(0)
        ]
    }

    let body = `What should be the percentage of the treasury invested in the protocol? 

The previous treasury invested in the protocol is: $${numberWithCommas(treasuryInvested.toString())}
The current treasury value is: $${numberWithCommas(treasuryValue.toString())}

In the spirit of putting our money where our mouth is, this vote is asking DAO members to decide on how much of the treasury liquidity should be invested in the Alluo protocol.

The more we invest into our own protocol, the more yield we can generate for Voters.

The liquidity will be invested in the USD farm to avoid exposure to volatile assets

Parameters for contract:
\`\`\`json
`

    body += JSON.stringify(json, null, 4) + "\n```";

    return body;
}

async function getIbAlluoApyCommand(asset: string, option: number) {
    const polygonProvider = new ethers.providers.JsonRpcProvider(settings.polygonUrl);
    const voteExecutor = (await ethers.getContractAt("IVoteExecutorMasterUtils", "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F")).connect(polygonProvider);

    const cmd = await voteExecutor.encodeApyCommand(
        `IbAlluo${asset}`,
        getAnnualInterestParam(option),
        getInterestPerSecondParam(option),
    );
    // console.log("Asset nanme", `IbAlluo${asset}`)
    // console.log("AnnualInterest", getAnnualInterestParam(option))
    // console.log("InterestPerSecond", getInterestPerSecondParam(option))
    return cmd[1];
}

export async function getIbAlluoApyProposalBody(asset: string, options: number[]) {
    const json = {
        "type": "apyProposal",
        "args": await Promise.all(options.map(async (option) => {
            return {
                data: {
                    cmdIndex: "0",
                    cmd: await getIbAlluoApyCommand(asset, option)
                },
                stringOption: `${option}% APY`,
            }
        }))
    }

    let body = `What should be the advertised APY for the ${asset} pool?

The Advertised APY is promised to depositors for one governance cycle. The higher the difference between the Advertised APY and the Realised APY (what we can achieve via Liquidity Direction) the more value will be redistributed to Voters.
    
The mechanism used to redistribute value to Voters has been described by the core team in this article: 

- https://blog.alluo.com/alluo-tokenomics-v2-3ff53bebcf8d
    
Parameters for contract:
\`\`\`json
`;

    body += JSON.stringify(json, null, 4) + "\n```";

    return body;
}

export function getLiquidityDirectionProposalBody(asset: string, options: string[]) {
    const json = {
        "type": "Liquidity Direction Vote",
        "args": options
    }

    let body = `Liquidity direction for all assets in the ${asset} farm with Alluo.

Each voted option will need a minimum of 5% of the total votes to be executed.

Parameters for contract:
\`\`\`json
`
    body += JSON.stringify(json, null, 4) + "\n```";

    return body;
}