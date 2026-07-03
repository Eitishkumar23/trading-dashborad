/**
 * Blockchain service barrel export.
 *
 * Import from this file everywhere in the application:
 *
 *   import { getContract, BlockchainError, BLOCKCHAIN_ERROR }
 *     from '../services/blockchain';
 *
 * This keeps import paths short and lets internals be reorganised
 * without touching every consumer.
 */

export {
  // Core helpers
  getProvider,
  getSigner,
  getContract,
  getReadOnlyContract,

  // Diagnostics
  verifyContractConnection,

  // Error types
  BlockchainError,
  BLOCKCHAIN_ERROR,
} from './blockchainService.js';

export {
  CONTRACT_ADDRESS,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CHAIN_NAME,
} from './contractConfig.js';
