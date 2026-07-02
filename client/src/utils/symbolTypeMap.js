/**
 * symbolTypeMap.js
 *
 * Single source of truth: symbol → { assetType, category }.
 * Mirrors the server-side INITIAL_ASSETS list in marketService.js.
 *
 * Use `resolveAssetType(symbol, assetType, category)` in any component
 * so badge rendering is consistent even when Transaction documents have
 * assetType === null (legacy / seeded data).
 */

const SYMBOL_MAP = {
  // ── Crypto ───────────────────────────────────────────────────────────
  BTC:      { assetType: 'CRYPTO',     category: null              },
  ETH:      { assetType: 'CRYPTO',     category: null              },
  SOL:      { assetType: 'CRYPTO',     category: null              },
  DOGE:     { assetType: 'CRYPTO',     category: null              },
  ADA:      { assetType: 'CRYPTO',     category: null              },
  LINK:     { assetType: 'CRYPTO',     category: null              },
  MATIC:    { assetType: 'CRYPTO',     category: null              },
  BNB:      { assetType: 'CRYPTO',     category: null              },
  XRP:      { assetType: 'CRYPTO',     category: null              },
  DOT:      { assetType: 'CRYPTO',     category: null              },
  AVAX:     { assetType: 'CRYPTO',     category: null              },
  UNI:      { assetType: 'CRYPTO',     category: null              },
  ATOM:     { assetType: 'CRYPTO',     category: null              },
  LTC:      { assetType: 'CRYPTO',     category: null              },

  // ── Stocks ───────────────────────────────────────────────────────────
  AAPL:     { assetType: 'STOCK',      category: null              },
  TSLA:     { assetType: 'STOCK',      category: null              },
  MSFT:     { assetType: 'STOCK',      category: null              },
  NVDA:     { assetType: 'STOCK',      category: null              },
  AMZN:     { assetType: 'STOCK',      category: null              },
  GOOGL:    { assetType: 'STOCK',      category: null              },
  META:     { assetType: 'STOCK',      category: null              },
  NFLX:     { assetType: 'STOCK',      category: null              },
  AMD:      { assetType: 'STOCK',      category: null              },
  INTC:     { assetType: 'STOCK',      category: null              },
  JPM:      { assetType: 'STOCK',      category: null              },
  BAC:      { assetType: 'STOCK',      category: null              },
  V:        { assetType: 'STOCK',      category: null              },
  MA:       { assetType: 'STOCK',      category: null              },

  // ── Precious Metals ──────────────────────────────────────────────────
  GOLD:     { assetType: 'REAL_ASSET', category: 'PRECIOUS_METALS' },
  SILVER:   { assetType: 'REAL_ASSET', category: 'PRECIOUS_METALS' },
  PLAT:     { assetType: 'REAL_ASSET', category: 'PRECIOUS_METALS' },

  // ── Energy ───────────────────────────────────────────────────────────
  CRUDEOIL: { assetType: 'REAL_ASSET', category: 'ENERGY'          },
  NATGAS:   { assetType: 'REAL_ASSET', category: 'ENERGY'          },

  // ── Real Estate ──────────────────────────────────────────────────────
  RSDNPROP: { assetType: 'REAL_ASSET', category: 'REAL_ESTATE'     },
  CMPROP:   { assetType: 'REAL_ASSET', category: 'REAL_ESTATE'     },
};

/**
 * Returns { assetType, category } for any transaction or holding.
 * Trusts the DB field when present; falls back to SYMBOL_MAP for
 * legacy records where assetType is null.
 */
export const resolveAssetType = (symbol, assetType, category) => {
  if (assetType && assetType !== 'null') {
    return {
      assetType: assetType.toUpperCase(),
      category: category
        ? category.toUpperCase()
        : (SYMBOL_MAP[symbol?.toUpperCase()]?.category ?? null),
    };
  }
  const entry = SYMBOL_MAP[symbol?.toUpperCase()];
  if (entry) return entry;
  // Unknown symbol — default to STOCK so a badge always renders
  return { assetType: 'STOCK', category: null };
};
