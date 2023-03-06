import { ethers } from "ethers";
import { google } from "googleapis";

exports.main = async (event: any) => {
    try {
        const rpcUrl = process.env.MAINNET_URL;
        const clientEmail = process.env.GOOGLE_APIS_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_APIS_PRIVATE_KEY;
        const sheetId = process.env.GOOGLE_APIS_SHEET_ID;

        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = ethers.Wallet.createRandom(provider);

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
        
        const sheet = google.sheets("v4")
        await sheet.spreadsheets.values.append({
            spreadsheetId: sheetId,
            auth: auth,
            range: "Sheet1",
            valueInputOption: "RAW",
            requestBody: {
                values: [
                    [
                        new Date().toUTCString(),
                        signer.address, 
                        ethers.formatEther(await provider.getBalance('0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3'))
                    ]
                ]
            }
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'success',
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'error',
            }),
        };
    }
}