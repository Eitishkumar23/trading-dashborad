/**
 * blockchainService.js
 *
 * Production-ready blockchain service layer for the AIQuantTrading platform.
 *
 * Responsibilities
 * ─────────────────
 *  • Provides reusable getProvider / getSigner / getContract helpers.
 *  • Validates MetaMask availability, wallet connection and correct network.
 *  • Normalises every possible failure into a single BlockchainError class so
 *    callers never have to inspect raw ethers / MetaMask error objects.
 *
 * What is NOT here
 * ─────────────────
 *  • No Buy / Sell / Portfolio logic — that is Phase 4.
 *  • No UI state — this is a pure service module.
 */

import { BrowserProvider, Contract } from 'ethers';
import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, SEPOLIA_CHAIN_NAME } from './contractConfig.js';

// ─── ABI — imported directly from Hardhat compilation output ───────────────
// Never recreate this manually; always use the artifact file.
import AIQuantTradingArtifact from '../../../../blockchain/artifacts/contracts/AIQuantTrading.sol/AIQuantTrading.json';

const ABI = AIQuantTradingArtifact.abi;

// ─── Error taxonomy ────────────────────────────────────────────────────────

/**
 * Error codes used across the service.
 * Components can branch on `error.code` for specific UX messages.
 */
export const BLOCKCHAIN_ERROR = {
  NO_METAMASK:         'NO_METAMASK',
  WALLET_NOT_CONNECTED:'WALLET_NOT_CONNECTED',
  WRONG_NETWORK:       'WRONG_NETWORK',
  USER_REJECTED:       'USER_REJECTED',
  CONTRACT_ERROR:      'CONTRACT_ERROR',
  UNKNOWN:             'UNKNOWN',
};

/**
 * Normalised error thrown by every function in this service.
 *
 * @property {string} code    — one of BLOCKCHAIN_ERROR.*
 * @property {string} message — human-readable message safe to display in UI
 * @property {unknown} cause  — original error for debugging
 */
export class BlockchainError extends Error {
  /**
   * @param {string}  code
   * @param {string}  message
   * @param {unknown} [cause]
   */
  constructor(code, message, cause) {
    super(message);
    this.name    = 'BlockchainError';
    this.code    = code;
    this.cause   = cause ?? null;
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Map a raw ethers / MetaMask error to a BlockchainError.
 * @param {unknown} err
 * @returns {BlockchainError}
 */
function normaliseError(err) {
  if (err instanceof BlockchainError) return err;

  // User pressed "Reject" in MetaMask
  if (
    err?.code === 'ACTION_REJECTED' ||          // ethers v6
    err?.code === 4001                           // MetaMask legacy
  ) {
    return new BlockchainError(
      BLOCKCHAIN_ERROR.USER_REJECTED,
      'Transaction was rejected in MetaMask.',
      err,
    );
  }

  // Wrong network detected at the ethers level
  if (err?.code === 'NETWORK_ERROR' || err?.message?.includes('network')) {
    return new BlockchainError(
      BLOCKCHAIN_ERROR.WRONG_NETWORK,
      `Please switch MetaMask to the ${SEPOLIA_CHAIN_NAME} network.`,
      err,
    );
  }

  // Contract reverted
  if (err?.code === 'CALL_EXCEPTION' || err?.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return new BlockchainError(
      BLOCKCHAIN_ERROR.CONTRACT_ERROR,
      err?.reason ?? err?.message ?? 'Smart contract call failed.',
      err,
    );
  }

  return new BlockchainError(
    BLOCKCHAIN_ERROR.UNKNOWN,
    err?.message ?? 'An unexpected blockchain error occurred.',
    err,
  );
}

// ─── Network validation ────────────────────────────────────────────────────

/**
 * Assert the connected wallet is on the expected network.
 * Throws BlockchainError (WRONG_NETWORK) when the check fails.
 *
 * @param {BrowserProvider} provider — already-constructed BrowserProvider
 * @returns {Promise<void>}
 */
async function assertCorrectNetwork(provider) {
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new BlockchainError(
      BLOCKCHAIN_ERROR.WRONG_NETWORK,
      `Wrong network detected (chain ID ${chainId}). ` +
      `Please switch MetaMask to ${SEPOLIA_CHAIN_NAME} (chain ID ${SEPOLIA_CHAIN_ID}).`,
    );
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Return an ethers v6 BrowserProvider backed by MetaMask.
 *
 * Throws:
 *  • BlockchainError(NO_METAMASK)  — MetaMask extension not installed.
 *
 * @returns {BrowserProvider}
 */
export function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new BlockchainError(
      BLOCKCHAIN_ERROR.NO_METAMASK,
      'MetaMask is not installed. Please install the MetaMask browser extension.',
    );
  }

  return new BrowserProvider(window.ethereum);
}

/**
 * Return an ethers v6 Signer for the currently connected wallet.
 *
 * Throws:
 *  • BlockchainError(NO_METAMASK)          — MetaMask not installed.
 *  • BlockchainError(WALLET_NOT_CONNECTED) — No account connected.
 *  • BlockchainError(WRONG_NETWORK)        — Connected to the wrong chain.
 *  • BlockchainError(USER_REJECTED)        — User cancelled the connection prompt.
 *
 * @returns {Promise<import('ethers').JsonRpcSigner>}
 */
export async function getSigner() {
  try {
    const provider = getProvider();

    // Confirm at least one account is available before requesting
    const accounts = await provider.send('eth_accounts', []);
    if (!accounts || accounts.length === 0) {
      throw new BlockchainError(
        BLOCKCHAIN_ERROR.WALLET_NOT_CONNECTED,
        'No wallet connected. Please connect MetaMask to continue.',
      );
    }

    await assertCorrectNetwork(provider);

    return await provider.getSigner();
  } catch (err) {
    throw normaliseError(err);
  }
}

/**
 * Return a contract instance connected to the currently active signer.
 *
 * Use this for write operations (buyAsset, etc.).
 * The contract instance is NOT cached — a new one is created per call so it
 * always reflects the current signer state.
 *
 * Throws: same as getSigner()
 *
 * @returns {Promise<Contract>}
 */
export async function getContract() {
  try {
    const signer = await getSigner();
    return new Contract(CONTRACT_ADDRESS, ABI, signer);
  } catch (err) {
    throw normaliseError(err);
  }
}

/**
 * Return a read-only contract instance backed by the provider (no signer).
 *
 * Use this for view/pure calls (getPortfolio, getAsset, getTotalAssets)
 * that do not require a connected wallet.
 *
 * Throws:
 *  • BlockchainError(NO_METAMASK)   — MetaMask not installed.
 *  • BlockchainError(WRONG_NETWORK) — Wrong chain.
 *
 * @returns {Promise<Contract>}
 */
export async function getReadOnlyContract() {
  try {
    const provider = getProvider();
    await assertCorrectNetwork(provider);
    return new Contract(CONTRACT_ADDRESS, ABI, provider);
  } catch (err) {
    throw normaliseError(err);
  }
}

/**
 * Convenience: verify that the service layer can reach the contract by
 * calling the gas-free `getTotalAssets()` view.
 *
 * Returns an object describing the current connection state.
 *
 * @returns {Promise<{
 *   connected: boolean,
 *   network: string,
 *   chainId: number,
 *   contractAddress: string,
 *   totalAssets: number | null,
 *   error: string | null
 * }>}
 */
export async function verifyContractConnection() {
  try {
    const provider = getProvider();
    await assertCorrectNetwork(provider);

    const contract     = await getReadOnlyContract();
    const totalAssets  = await contract.getTotalAssets();
    const network      = await provider.getNetwork();

    return {
      connected:       true,
      network:         SEPOLIA_CHAIN_NAME,
      chainId:         Number(network.chainId),
      contractAddress: CONTRACT_ADDRESS,
      totalAssets:     Number(totalAssets),
      error:           null,
    };
  } catch (err) {
    const normalised = normaliseError(err);
    return {
      connected:       false,
      network:         null,
      chainId:         null,
      contractAddress: CONTRACT_ADDRESS,
      totalAssets:     null,
      error:           normalised.message,
    };
  }
}
