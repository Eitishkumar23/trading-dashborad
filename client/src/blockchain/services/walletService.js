import { formatEther } from "ethers";

import { getProvider } from "../utils/provider";
import { getSigner } from "../utils/signer";

/**
 * Returns connected wallet information.
 */
export const getWalletInfo = async () => {
    const provider = getProvider();

    const accounts = await provider.send("eth_accounts", []);

    if (!accounts.length) {
        return null;
    }

    const address = accounts[0];

    const balance = await provider.getBalance(address);

    const network = await provider.getNetwork();

    return {
        address,
        balance: parseFloat(formatEther(balance)).toFixed(4),
        networkName: network.name,
        chainId: Number(network.chainId),
    };
};

/**
 * Connect wallet using MetaMask.
 */
export const connectWallet = async () => {
    const provider = getProvider();

    const accounts = await provider.send("eth_requestAccounts", []);

    if (!accounts.length) {
        throw new Error("No wallet account found.");
    }

    const address = accounts[0];

    const balance = await provider.getBalance(address);

    const network = await provider.getNetwork();

    return {
        address,
        balance: parseFloat(formatEther(balance)).toFixed(4),
        networkName: network.name,
        chainId: Number(network.chainId),
    };
};

/**
 * Returns signer.
 */
export const getWalletSigner = async () => {
    return await getSigner();
};

export const sendTestTransaction = async (walletAddress) => {
    const signer = await getSigner();

    const tx = await signer.sendTransaction({
        to: walletAddress,
        value: 0,
    });

    const receipt = await tx.wait();

    return receipt.hash;
};
console.log("walletService loaded");