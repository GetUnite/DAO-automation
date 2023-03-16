import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';

import { ethers } from 'hardhat';
import { BigNumber, Contract } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils';
import { IERC20Metadata } from '../../typechain';

const bot: Telegraf<Context<Update>> = new Telegraf(process.env.TELEGRAM_BOT_API as string);

const uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

let alluo: IERC20Metadata;
ethers.getContractAt("IERC20Metadata", "0x1e5193ccc53f25638aa22a940af899b692e10b09").then((x) => {
    alluo = x
});

const knownAddress = [
    // Automation mnemonic addresses
    '0xfc32Afc3B324b45323A77785f63a2c7108B04200', // DAO automation bot
    '0xF3272F307995940acA3EDAA897C4f5BCf4cc8Dd9', // #1 for trading FUNDED operating
    '0xF7DB6A7706CeE8B08229a8292F2AC299b67c3697', // #2 for trading FUNDED operating
    '0x8C82F98decB9ce228c2a3CB337D70DeCdee71739', // #3 for trading FUNDED operating
    '0x733BDc1Ada5BED2eD6585e289593e88D0E6e2877', // #4 for trading FUNDED operating
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
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /start command`);
});

bot.command("listenblocks", (ctx) => {
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /listenblocks command`);

    ctx.reply('Listening for new blocks');

    ethers.provider.on("block", (block) => {
        ctx.reply(
            `Current block is ${block}`
        )
    })
})

bot.command("listentesttrades", (ctx) => {
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /listentesttrades command`);

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
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /listenalluotrades command`);

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

bot.command("getbalances", async (ctx) => {
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /getbalances command`);

    let balances = "Trading bot accounts balances:\n\n";
    let alluoTotal = BigNumber.from(0);
    let ethTotal = BigNumber.from(0);
    for (let i = 0; i < knownAddress.length; i++) {
        const element = knownAddress[i];
        const alluoBalance = await alluo.balanceOf(element);
        const ethBalance = await ethers.provider.getBalance(element);

        balances += `Index ${i} - ${element}:
ETH: ${formatEther(ethBalance)}
ALLUO: ${formatEther(alluoBalance)}
https://etherscan.io/address/${element}

`
        ethTotal = ethTotal.add(ethBalance);
        alluoTotal = alluoTotal.add(alluoBalance);
    }

    balances += `

Total ETH - ${formatEther(ethTotal)}
Total ALLUO - ${formatEther(alluoTotal)}`;

    ctx.reply(balances);
});

bot.command("stoplisteners", (ctx) => {
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /stoplisteners command`);

    ctx.reply('Stopped all listeners');

    ethers.provider.removeAllListeners();
})

bot.command("logs", (ctx) => {
    console.log(`User ${ctx.message.from.first_name} ${ctx.message.from.last_name} (@${ctx.message.from.username}) sent /logs command`);

    const filePath = "nohup.out";
    const filePathBot = "bot.out";

    ctx.replyWithDocument(
        {
            source: filePath,
            filename: `${new Date().toUTCString()}_logs.log`
        }
    );

    ctx.replyWithDocument(
        {
            source: filePathBot,
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
