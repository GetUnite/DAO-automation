
import { ethers } from 'ethers';
import fetch from 'node-fetch';

export const callContract = async (
    abi: ethers.ContractInterface | { inputs: never[]; name: string; outputs: { internalType: string; name: string; type: string; }[]; stateMutability: string; type: string; }[],
    address: string,
    functionSignature: string,
    params: never[] | null,
    chain: number,
) => {
    const readOnlyProvider = typeof process.env.OPTIMISM_URL == 'string' ? process.env.OPTIMISM_URL : 'https://opt-mainnet.g.alchemy.com/v2/aQpiSjWs-lIJ9aqb7tR6qGSiqdkNhfbn';
    const provider = new ethers.providers.JsonRpcProvider(readOnlyProvider, 'any');
    await provider.getNetwork();
    const contract = new ethers.Contract(address, abi, provider);

    try {
        const method = contract[functionSignature].apply(null, params);
        const txResult = await method;

        if (ethers.BigNumber.isBigNumber(txResult)) {
            return txResult.toString();
        }

        return txResult;
    } catch (error) {
        console.log({
            abi: abi,
            address: address,
            functionSignature: functionSignature,
            params: params,
            error: error,
        });
    }
};


const optimisedYearnFarmInterestApiUrl =
    'https://api.yearn.finance/v1/chains/10/vaults/all';
const optimisedBeefyFarmInterestApiUrl = 'https://api.beefy.finance/';

const compoundingApy = (baseApy: number, rewardApy: number, fee: number, vaultPercentage: number) => {
    const apy =
        Math.pow(
            1 + fee * (Math.pow(1 + baseApy, 1 / 365) - 1 + rewardApy / 365),
            365,
        ) - 1;
    // the 100 cancel each other but it's just to make clear that
    // the first expression needs to be converted into % so * 100
    // the second expressions needs to be converted into decimal so / 100
    return apy * 100 * (vaultPercentage / 10000);
};

export const getOptimisedFarmInterest = async (
    farmAddress: any,
    farmType: string,
    chain = 10,
) => {
    const abi = [
        {
            inputs: [],
            name: 'getActiveUnderlyingVaults',
            outputs: [
                {
                    internalType: 'address[]',
                    name: '',
                    type: 'address[]',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'getUnderlyingVaultsPercents',
            outputs: [
                {
                    internalType: 'uint256[]',
                    name: '',
                    type: 'uint256[]',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'feeOnYield',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];

    const fee =
        1 -
        (await callContract(abi, farmAddress, 'feeOnYield()', null, chain)) / 10000;

    const underlyingVaultsPercents = await callContract(
        abi,
        farmAddress,
        'getUnderlyingVaultsPercents()',
        [],
        chain,
    );

    // gets underlying vaults addresses
    const activeUnderlyingVaults = await callContract(
        abi,
        farmAddress,
        'getActiveUnderlyingVaults()',
        [],
        chain,
    );

    let beefyVaults: any[] = [];
    let yearnVaults: any[] = [];
    let beefyVaultsApys: never[] = [];

    const vaultsJsonResult = await fetch(
        farmType == 'BEEFY'
            ? optimisedBeefyFarmInterestApiUrl + 'vaults'
            : optimisedYearnFarmInterestApiUrl,
    ).then(res => res.json());

    if (farmType == 'BEEFY') {
        beefyVaults = vaultsJsonResult;

        const beefyVaultsApysJsonResult = await fetch(
            optimisedBeefyFarmInterestApiUrl + 'apy',
        ).then(res => res.json());

        beefyVaultsApys = beefyVaultsApysJsonResult;
    } else {
        yearnVaults = vaultsJsonResult;
    }

    // for each underlying vault get apy from the json return on the apy call * the vault percentage
    const underlyingVaultsApys = await Promise.all(
        activeUnderlyingVaults.map(async (activeUnderlyingVault: any, index: string | number) => {
            let activeUnderlyingVaultInfo;
            let baseApy;
            let rewardsApy;
            if (farmType == 'BEEFY') {
                activeUnderlyingVaultInfo = beefyVaults.find(
                    ajr => ajr.earnedTokenAddress == activeUnderlyingVault,
                );

                const vaultId = activeUnderlyingVaultInfo.id;

                return (
                    beefyVaultsApys[vaultId] *
                    fee *
                    underlyingVaultsPercents[index].toNumber() / 100
                );
                // These lines will be for compounding when we figure out how to get boost % from beefy
                // const activeUnderlyingVaultApyBreakdown = beefyVaultsApys[vaultId];

                // baseApy = activeUnderlyingVaultApyBreakdown.net_apy;
                // rewardsApy = activeUnderlyingVaultApyBreakdown.staking_rewards_apr;
            } else {
                activeUnderlyingVaultInfo = yearnVaults.find(
                    ajr => ajr.address == activeUnderlyingVault,
                );

                const activeUnderlyingVaultApy = activeUnderlyingVaultInfo.apy;
                baseApy = activeUnderlyingVaultApy.net_apy;
                rewardsApy = activeUnderlyingVaultApy.staking_rewards_apr;
            }

            return compoundingApy(
                baseApy,
                rewardsApy,
                fee,
                underlyingVaultsPercents[index].toNumber(),
            );
        }),
    );
    console.log(underlyingVaultsApys)
    return underlyingVaultsApys.reduce(
        (previous: any, current: any) => previous + current,
        0,
    );
};

// getOptimisedFarmInterest("0x2EC847395B6247Ab72b7B37432989f4547A0e947", "BEEFY").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0xA430432eEf5C062D34e4078540b91C2ec7DBe0c9", "BEEFY").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0xAf332f4d7A82854cB4B6345C4c133eC60c4eAd87", "BEEFY").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0x75862d2fEdb1c6a9123F3b5d5E36D614570B404d", "BEEFY").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0xDd7ebC54b851E629E61bc49DFcAed41C13fc67Da", "YEARN").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0x4eC3177F5c2500AAABE56DDbD8907d41d17Fc2E9", "YEARN").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0x306Df6b5D50abeD3f7bCbe7399C4b8e6BD55cB81", "YEARN").then().catch((error) => console.log(error))
// getOptimisedFarmInterest("0x2682c8057426FE5c462237eb3bfcfEDFb9539004", "YEARN").then().catch((error) => console.log(error))
