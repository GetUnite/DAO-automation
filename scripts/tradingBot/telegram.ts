import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';

import { ethers } from 'hardhat';

const bot: Telegraf<Context<Update>> = new Telegraf(process.env.TELEGRAM_BOT_API as string);

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

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));