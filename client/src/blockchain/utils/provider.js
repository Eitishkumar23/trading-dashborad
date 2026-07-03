import { BrowserProvider } from "ethers";

/**
 * Returns a reusable ethers BrowserProvider.
 * Throws an error if MetaMask is not installed.
 */
export const getProvider = () => {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
    }

    return new BrowserProvider(window.ethereum);
};