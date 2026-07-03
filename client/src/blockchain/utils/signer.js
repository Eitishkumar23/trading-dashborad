import { getProvider } from "./provider";

/**
 * Returns the connected wallet signer.
 * Requests wallet connection if needed.
 */
export const getSigner = async () => {
    const provider = getProvider();

    // Request wallet connection
    await provider.send("eth_requestAccounts", []);

    return await provider.getSigner();
};