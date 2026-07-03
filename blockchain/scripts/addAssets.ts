import { network } from "hardhat";
import deploymentData from "../deployment.json" with { type: "json" };
import AIQuantTradingArtifact from "../artifacts/contracts/AIQuantTrading.sol/AIQuantTrading.json" with { type: "json" };

// ─────────────────────────────────────────────────────────────────────────
// Assets to register
// ─────────────────────────────────────────────────────────────────────────

const ASSETS = [
    { name: "Bitcoin", symbol: "BTC", type: 1 },
    { name: "Ethereum", symbol: "ETH", type: 1 },
    { name: "Apple Inc.", symbol: "AAPL", type: 0 },
    { name: "Tesla Inc.", symbol: "TSLA", type: 0 },
    { name: "Gold", symbol: "GOLD", type: 2 },
    { name: "Silver", symbol: "SILVER", type: 2 },
];

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
    const { viem } = await network.connect();

    // Get wallet client (uses your private key from .env)
    const [walletClient] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    const contractAddress = deploymentData.contractAddress as `0x${string}`;
    const abi = AIQuantTradingArtifact.abi;

    console.log("==================================");
    console.log("Adding Assets to AIQuantTrading");
    console.log("Contract:", contractAddress);
    console.log("Network: ", deploymentData.network);
    console.log("Wallet:  ", walletClient.account.address);
    console.log("==================================\n");

    for (const asset of ASSETS) {
        try {
            console.log(`Adding ${asset.symbol} - ${asset.name}...`);

            // Write directly using walletClient
            const txHash = await walletClient.writeContract({
                address: contractAddress,
                abi,
                functionName: "addAsset",
                args: [asset.name, asset.symbol, asset.type],
                chain: walletClient.chain,
                account: walletClient.account,
            });

            // Wait for confirmation
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            console.log(`✅ ${asset.symbol} added! Tx: ${txHash}\n`);

        } catch (err: any) {
            console.error(`❌ Failed to add ${asset.symbol}:`, err.message, "\n");
        }
    }

    console.log("==================================");
    console.log("All assets processed!");
    console.log("==================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});