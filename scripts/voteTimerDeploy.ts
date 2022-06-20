import { ethers } from "hardhat";

async function main() {
    const Timer = await ethers.getContractFactory("VoteTimer");
    const timer = await Timer.deploy(
        1655683200,
        3600,
        300
    );

    console.log("Deployed @", timer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});