/**
 * contractConfig.js
 *
 * Single source of truth for blockchain network and contract details.
 * All blockchain service files import from here — never hardcode these values
 * elsewhere in the application.
 */

/** Ethereum Sepolia testnet chain ID (decimal). */
export const SEPOLIA_CHAIN_ID = 11155111;

/** Human-readable name shown in error messages. */
export const SEPOLIA_CHAIN_NAME = 'Sepolia';

/**
 * Deployed AIQuantTrading contract address on Sepolia.
 * Update this value if the contract is redeployed.
 */
export const CONTRACT_ADDRESS = '0xe82d74939de3828285a12f5aa417ea1b01f28fc9';
