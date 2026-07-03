import { formatEther } from "ethers";

import { getProvider } from "../utils/provider";
import { getSigner } from "../utils/signer";


import { NETWORK } from "../config/contract";

/**
 * Connect to MetaMask and return the connected wallet address.
 */
export const connectWallet = async () => {
    const signer = await getSigner();
    return await signer.getAddress();
};

/**
 * Get currently connected wallet address.
 */
export const getWalletAddress = async () => {
    const provider = getProvider();

    const accounts = await provider.send("eth_accounts", []);

    if (!accounts.length) {
        return null;
    }

    return accounts[0];
};

/**
 * Get wallet ETH balance.
 */
export const getWalletBalance = async (address) => {
    const provider = getProvider();

    const balance = await provider.getBalance(address);

    return formatEther(balance);
};

/**
 * Get connected network.
 */
export const getCurrentNetwork = async () => {
    const provider = getProvider();

    return await provider.getNetwork();
};

/**
 * Check whether MetaMask is connected to Sepolia.
 */
export const isCorrectNetwork = async () => {
    const network = await getCurrentNetwork();

    return Number(network.chainId) === NETWORK.chainId;
};

/**
 * Sends a zero-value test transaction to the connected wallet.
 */
export const sendTestTransaction = async (walletAddress) => {
    const signer = await getSigner();

    const tx = await signer.sendTransaction({
        to: walletAddress,
        value: 0,
    });

    const receipt = await tx.wait();

    return receipt.hash;
};