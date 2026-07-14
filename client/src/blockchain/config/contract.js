// Import deployment details
import deployment from "../../../../blockchain/deployment.json";

// Import Smart Contract ABI
import AIQuantTradingArtifact from "../abi/AIQuantTrading.json";

// ===================================================== 
// Smart Contract Configuration
// =====================================================

export const CONTRACT_NAME = deployment.contractName;

export const CONTRACT_ADDRESS = deployment.contractAddress;

export const CONTRACT_ABI = AIQuantTradingArtifact.abi;

// =====================================================
// Network Configuration
// =====================================================

export const NETWORK = {
    name: "Sepolia",
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    currency: "ETH",
    explorer: "https://sepolia.etherscan.io",
};