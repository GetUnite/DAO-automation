type Settings = {
    testnet: boolean;
    testnetSpace?: string;
    tokensToCheckMainnet: string[];
    tokensToCheckPolygon: string[];
    mainnetUrl: string;
    polygonUrl: string;
    optimismUrl: string;
    testnetUrl?: string;
    mnemonic: string;
    treasuryInvestedOverride?: number;
    treasuryValueOverride?: number;
    voteExecutorUtilsAddress: string;
    voteExecutorMasterAddress: string;
    strategyHandlerAddress: string;
}

// Testnet snapshot: https://demo.snapshot.org/

export const settings: Settings = {
    testnet: false,
    testnetSpace: "0xtuytuy.eth",
    tokensToCheckMainnet: [
        "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
        "0xd533a949740bb3306d119cc777fa900ba034cd52", // CRV
        "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b", // CVX
        "0x5a98fcbea516cf06857215779fd812ca3bef1b32", // LDO
        "0x31429d1856ad1377a8a0079410b297e1a9e214c2", // ANGLE
        "0x090185f2135308bad17527004364ebcc2d37e5f6", // SPELL
        "0xc581b735a1688071a1746c968e0798d642ede491", // EURT,
        "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c" // EUROC
    ],
    tokensToCheckPolygon: [
        "0xe0b52e49357fd4daf2c15e02058dce6bc0057db4", // agEUR
        "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC
        "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH
        "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", // WBTC
        "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f", // EURT
    ],
    mainnetUrl: process.env.MAINNET_URL as string,
    polygonUrl: process.env.POLYGON_URL as string,
    optimismUrl: process.env.OPTIMISM_URL as string,
    testnetUrl: process.env.TESTNET_URL,
    mnemonic: process.env.MNEMONIC as string,
    treasuryInvestedOverride: 414561.89,
    treasuryValueOverride: 596241.96,
    voteExecutorUtilsAddress: "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F",
    voteExecutorMasterAddress: "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB",
    strategyHandlerAddress: "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29"
}