/**
 * Converts ethers / MetaMask errors into user-friendly messages.
 */
export const getBlockchainError = (error) => {
    if (!error) {
        return "Unknown blockchain error.";
    }

    // User rejected MetaMask request
    if (error.code === 4001) {
        return "Transaction was rejected by the user.";
    }

    // Unsupported chain
    if (error.code === 4902) {
        return "Unsupported Ethereum network.";
    }

    // Wallet not installed
    if (
        error.message?.toLowerCase().includes("metamask") ||
        error.message?.toLowerCase().includes("ethereum")
    ) {
        return "MetaMask is not installed.";
    }

    // Fallback
    return error.message || "Something went wrong.";
};