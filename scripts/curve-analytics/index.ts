import { ethers } from "ethers";

exports.main = async (event: any) => {
    try {
        const rpcUrl = process.env.MAINNET_URL;
        console.log(rpcUrl);
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = ethers.Wallet.createRandom(provider);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `hello world, i am ${signer.address}`,
                balance: ethers.formatEther(await provider.getBalance('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3')),
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
}