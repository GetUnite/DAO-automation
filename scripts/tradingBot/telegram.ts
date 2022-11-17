import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';

import { ethers } from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';

const bot: Telegraf<Context<Update>> = new Telegraf(process.env.TELEGRAM_BOT_API as string);

const uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const knownAddress = [
    // Automation mnemonic addresses
    '0xfc32Afc3B324b45323A77785f63a2c7108B04200', // DAO automation bot
    '0xF3272F307995940acA3EDAA897C4f5BCf4cc8Dd9', // #1 for trading FUNDED operating
    '0xF7DB6A7706CeE8B08229a8292F2AC299b67c3697', // #2 for trading FUNDED operating
    '0x8C82F98decB9ce228c2a3CB337D70DeCdee71739', // #3 for trading
    '0x733BDc1Ada5BED2eD6585e289593e88D0E6e2877', // #4 for trading
    '0x350C13ceEBC94414f944F039913591f15163d2cD', // #5 for trading
    '0x2A1160B40a4BF67668D8264FcBBc292523e9a49e', // #6 for trading
    '0xAA2B30afae9d375c43be20ed09AE3AeA3aE68C21', // #7 for trading
    '0x7d330C5d3b2bA38c10FD5222d37e6dd6f2A294Eb', // #8 for trading
    '0x096B31DD262B323d1178c2cf00943f96AE809Bd2', // #9 for trading
    '0xf2eB9cbf7D34077DAf821188ebAe1A6086232Ed5'  // #10 for trading
]

type SwapEvent = {
    sender: string,
    recipient: string,
    amount0: BigNumber,
    amount1: BigNumber,
    sqrtPriceX96: BigNumber,
    liquidity: BigNumber,
    tick: number
}

const abi = [
    "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
];

bot.start((ctx) => {
    ctx.reply('Hello ' + ctx.from.first_name + '!');
});

bot.command("listenblocks", (ctx) => {
    ctx.reply('Listening for new blocks');

    ethers.provider.on("block", (block) => {
        ctx.reply(
            `Current block is ${block}`
        )
    })
})

bot.command("listentesttrades", (ctx) => {
    ctx.reply('Listening USDC-WETH trades (NOT ALLUO)');
    const address = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"

    const filter = {
        address: address,
        topics: [
            ethers.utils.id("Swap(address,address,int256,int256,uint160,uint128,int24)")
        ]
    };

    ethers.provider.on(filter, (log) => {

        const contract = new Contract(address, abi, ethers.provider);
        const event: SwapEvent = contract.interface.decodeEventLog("Swap", log.data, log.topics) as unknown as SwapEvent;

        ctx.reply(
`
UniswapV3 exchange USDC-WETH:

Pool balance diff:
USDC: ${formatUnits(event.amount0.toString(), 6)}
WETH: ${formatUnits(event.amount1.toString(), 18)}

Recepient: ${event.recipient} ${knownAddress.includes(event.recipient) ? "(known address)" : (event.recipient == uniswapRouter ? "UniswapV3 router" : "UNKNOWN ADDRESS")}
Sender: ${event.sender} ${knownAddress.includes(event.sender) ? "(known address)" : (event.sender == uniswapRouter ? "UniswapV3 router" : "UNKNOWN ADDRESS")}

Tx: https://etherscan.io/tx/${log.transactionHash}
`  
        )
    })
})

bot.command("listenalluotrades", (ctx) => {
    ctx.reply('Listening ALLUO-WETH trades');
    const address = "0x4e44c9abc0b7c61e5f9e165271581d823abf684d"

    const filter = {
        address: address,
        topics: [
            ethers.utils.id("Swap(address,address,int256,int256,uint160,uint128,int24)")
        ]
    };

    ethers.provider.on(filter, (log) => {

        const contract = new Contract(address, abi, ethers.provider);
        const event: SwapEvent = contract.interface.decodeEventLog("Swap", log.data, log.topics) as unknown as SwapEvent;

        ctx.reply(
`
UniswapV3 exchange ALLUO-WETH:

Pool balance diff:
ALLUO: ${formatUnits(event.amount0.toString(), 18)}
WETH: ${formatUnits(event.amount1.toString(), 18)}

Recepient: ${event.recipient} ${knownAddress.includes(event.recipient) ? "(known address)" : (event.recipient == uniswapRouter ? "UniswapV3 router" : "UNKNOWN ADDRESS")}
Sender: ${event.sender} ${knownAddress.includes(event.sender) ? "(known address)" : (event.sender == uniswapRouter ? "UniswapV3 router" : "UNKNOWN ADDRESS")}

Tx: https://etherscan.io/tx/${log.transactionHash}
`  
        )
    })
})

bot.command("stoplisteners", (ctx) => {
    ctx.reply('Stopped all listeners');

    ethers.provider.removeAllListeners();
})

bot.command("logs", (ctx) => {
    const filePath = "nohup.out";

    ctx.replyWithDocument(
        {
            source: filePath,
            filename: `${new Date().toUTCString()}_bot_logs.log`
        }
    );
});

bot.catch((err, ctx) => {
    console.log(err);
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));