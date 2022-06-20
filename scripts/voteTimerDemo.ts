import { ethers } from "hardhat";

async function main() {
    const timer = await ethers.getContractAt("VoteTimer", "0x0ccC76540E087b2E7567F7BFf80d7EEA0d4F00aC");

    if (!(await timer.canExecute2WeekVote())) {
        console.log("Contract told me to not do anything, exiting...")
        return;
    }

    console.log("Contract told me to do something, printing cats...");
    console.log(`
                      /^--^\     /^--^\     /^--^\
                      \____/     \____/     \____/
                     /      \   /      \   /      \
                    |        | |        | |        |
                     \__  __/   \__  __/   \__  __/
|^|^|^|^|^|^|^|^|^|^|^|^\ \^|^|^|^/ /^|^|^|^|^\ \^|^|^|^|^|^|^|^|^|^|^|^|
| | | | | | | | | | | | |\ \| | |/ /| | | | | | \ \ | | | | | | | | | | |
########################/ /######\ \###########/ /#######################
| | | | | | | | | | | | \/| | | | \/| | | | | |\/ | | | | | | | | | | | |
|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|_|`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});