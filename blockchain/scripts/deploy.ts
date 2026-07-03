import { network } from "hardhat";

async function main() {
    const { viem } = await network.connect();

    console.log("Deploying AIQuantTrading...");

    const contract = await viem.deployContract("AIQuantTrading");

    console.log("==================================");
    console.log("Deployment Successful!");
    console.log("Contract Address:", contract.address);
    console.log("Network: Sepolia");
    console.log("==================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});