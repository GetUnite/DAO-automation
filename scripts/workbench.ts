import { tweet } from "./common";

async function main() {
    await tweet("Мой хозяин создал меня (бота) и сказал отправить этот твит. Мяу.")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});