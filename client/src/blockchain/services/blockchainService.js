import { formatEther } from "ethers";

import { getProvider } from "../utils/provider";
import { getSigner } from "../utils/signer";
import { getReadContract, getWriteContract } from "./contractService";

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

// ─────────────────────────────────────────────────────────────────────────
// Smart Contract Read Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Read the contract owner address.
 */
export const getContractOwner = async () => {
    const contract = getReadContract();
    return await contract.owner();
};

/**
 * Read total number of registered assets.
 */
export const getTotalAssets = async () => {
    const contract = getReadContract();
    const total = await contract.getTotalAssets();
    return Number(total); // convert BigInt → number
};

/**
 * Read a single asset by its ID.
 */
export const getAsset = async (assetId) => {
    const contract = getReadContract();
    const asset = await contract.getAsset(assetId);

    return {
        assetId: Number(asset.assetId),
        name: asset.name,
        symbol: asset.symbol,
        assetType: Number(asset.assetType), // 0=Stock, 1=Crypto, 2=RealAsset
        isActive: asset.isActive,
    };
};

/**
 * Read the connected wallet's portfolio from the contract.
 * Uses signer because contract uses msg.sender internally.
 */
export const getPortfolio = async () => {
    const contract = await getWriteContract(); // signer needed for msg.sender
    const positions = await contract.getPortfolio();

    return positions.map((p) => ({
        assetId: Number(p.assetId),
        quantity: Number(p.quantity),
        purchasePrice: Number(p.purchasePrice),
        owner: p.owner,
    }));
};

// ─────────────────────────────────────────────────────────────────────────
// Symbol → Contract Asset ID Mapping
// ─────────────────────────────────────────────────────────────────────────

const SYMBOL_TO_ASSET_ID = {
    BTC: 1,
    ETH: 2,
    AAPL: 3,
    TSLA: 4,
    GOLD: 5,
    SILVER: 6,
};

/**
 * Buy an asset on-chain after backend trade succeeds.
 * Uses best-effort approach — never throws to caller.
 * Backend + MongoDB remain source of truth.
 *
 * @param {string} symbol        - Asset symbol e.g. "BTC"
 * @param {number} quantity      - How many units bought
 * @param {number} purchasePrice - Price per unit (scaled to integer)
 * @returns {{ success: boolean, txHash?: string, error?: string }}
 */
export const buyAssetOnChain = async (symbol, quantity, purchasePrice) => {
    try {
        // Step 1: Check if this asset exists in our contract
        const assetId = SYMBOL_TO_ASSET_ID[symbol.toUpperCase()];
        if (!assetId) {
            return {
                success: false,
                error: `${symbol} is not registered on-chain yet.`,
            };
        }

        // Step 2: Get write contract (triggers MetaMask)
        const contract = await getWriteContract();

        // Step 3: Convert price to integer (contract stores as uint256)
        // e.g. price 45123.99 → 4512399 (multiply by 100, remove decimals)
        const priceScaled = Math.round(purchasePrice * 100);
        const quantityInt = Math.round(quantity);

        // Step 4: Call buyAsset on contract
        const tx = await contract.buyAsset(
            assetId,
            quantityInt,
            priceScaled
        );

        // Step 5: Wait for blockchain confirmation
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
        };

    } catch (err) {
        // User rejected MetaMask → specific message
        if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
            return {
                success: false,
                error: "MetaMask transaction rejected by user.",
            };
        }

        return {
            success: false,
            error: err?.message || "Blockchain transaction failed.",
        };
    }
};

/**
 * Read the connected wallet's on-chain trade history.
 * Uses signer because contract uses msg.sender internally.
 */
export const getTradeHistory = async () => {
    const contract = await getWriteContract(); // signer needed for msg.sender
    const history = await contract.getTradeHistory();

    return history.map((t) => ({
        txId: Number(t.txId),
        assetId: Number(t.assetId),
        symbol: t.symbol,
        txType: Number(t.txType), // 0=Buy, 1=Sell
        quantity: Number(t.quantity),
        price: Number(t.price),
        timestamp: Number(t.timestamp),
        trader: t.trader,
    }));
};

/**
 * Sell an asset on-chain after backend trade succeeds.
 * Uses best-effort approach — never throws to caller.
 * Backend + MongoDB remain source of truth.
 *
 * @param {string} symbol       - Asset symbol e.g. "BTC"
 * @param {number} quantity     - How many units sold
 * @param {number} sellPrice    - Price per unit (scaled to integer)
 * @returns {{ success: boolean, txHash?: string, error?: string }}
 */
export const sellAssetOnChain = async (symbol, quantity, sellPrice) => {
    try {
        // Step 1: Check if this asset exists in our contract
        const assetId = SYMBOL_TO_ASSET_ID[symbol.toUpperCase()];
        if (!assetId) {
            return {
                success: false,
                error: `${symbol} is not registered on-chain yet.`,
            };
        }

        // Step 2: Get write contract (triggers MetaMask)
        const contract = await getWriteContract();

        // Step 3: Convert price to integer (contract stores as uint256)
        // e.g. price 45123.99 → 4512399 (multiply by 100, remove decimals)
        const priceScaled = Math.round(sellPrice * 100);
        const quantityInt = Math.round(quantity);

        // Step 4: Call sellAsset on contract
        const tx = await contract.sellAsset(
            assetId,
            quantityInt,
            priceScaled
        );

        // Step 5: Wait for blockchain confirmation
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
        };

    } catch (err) {
        // User rejected MetaMask → specific message
        if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
            return {
                success: false,
                error: "MetaMask transaction rejected by user.",
            };
        }

        return {
            success: false,
            error: err?.message || "Blockchain transaction failed.",
        };
    }
};