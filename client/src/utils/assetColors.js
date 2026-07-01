/**
 * assetColors.js
 *
 * Single source of truth for all asset colors across the application.
 *
 * Rules:
 *  - Every asset has one fixed color, regardless of where it appears.
 *  - Colors are keyed by SYMBOL (upper-case) for per-asset lookup.
 *  - A separate NAME map handles chart data that comes in by full name.
 *  - Asset-class colors handle allocation/class-level charts.
 *  - getAssetColor(key) resolves symbols, names, and class labels — call
 *    this everywhere instead of hard-coding hex values or COLORS arrays.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Per-asset colors  (keyed by SYMBOL, upper-case)
// ─────────────────────────────────────────────────────────────────────────────
export const SYMBOL_COLORS = {
  // Cryptocurrencies
  BTC:      '#f7931a', // Bitcoin orange
  ETH:      '#627eea', // Ethereum indigo
  SOL:      '#9945ff', // Solana purple
  DOGE:     '#c2a633', // Doge gold
  ADA:      '#0033ad', // Cardano blue
  LINK:     '#2a5ada', // Chainlink cobalt
  MATIC:    '#8247e5', // Polygon violet

  // Stocks
  AAPL:     '#555555', // Apple graphite
  TSLA:     '#e82127', // Tesla red
  MSFT:     '#00a4ef', // Microsoft cyan-blue
  NVDA:     '#76b900', // Nvidia green
  AMZN:     '#ff9900', // Amazon orange
  GOOGL:    '#4285f4', // Google blue
  META:     '#1877f2', // Meta blue
  NFLX:     '#e50914', // Netflix red (distinct shade)

  // Precious Metals
  GOLD:     '#d4a017', // Gold
  SILVER:   '#9ea8b0', // Silver
  PLAT:     '#7b9ea6', // Platinum steel-blue

  // Energy
  CRUDEOIL: '#5c3d1e', // Oil dark brown
  NATGAS:   '#e67e22', // Natural gas amber-orange

  // Real Estate
  RSDNPROP: '#27ae60', // Residential — emerald green
  CMPROP:   '#16a085', // Commercial — teal green
};

// ─────────────────────────────────────────────────────────────────────────────
// Full-name → symbol map  (used when chart data contains `name` not `symbol`)
// ─────────────────────────────────────────────────────────────────────────────
const NAME_TO_SYMBOL = {
  'bitcoin':               'BTC',
  'ethereum':              'ETH',
  'solana':                'SOL',
  'dogecoin':              'DOGE',
  'cardano':               'ADA',
  'chainlink':             'LINK',
  'polygon':               'MATIC',
  'apple inc.':            'AAPL',
  'tesla inc.':            'TSLA',
  'microsoft corp.':       'MSFT',
  'nvidia corp.':          'NVDA',
  'amazon.com inc.':       'AMZN',
  'alphabet inc.':         'GOOGL',
  'meta platforms':        'META',
  'netflix inc.':          'NFLX',
  'gold':                  'GOLD',
  'silver':                'SILVER',
  'platinum':              'PLAT',
  'crude oil':             'CRUDEOIL',
  'natural gas':           'NATGAS',
  'residential property':  'RSDNPROP',
  'commercial property':   'CMPROP',
};

// ─────────────────────────────────────────────────────────────────────────────
// Asset-class colors  (for allocation / class-level bar charts)
// ─────────────────────────────────────────────────────────────────────────────
export const CLASS_COLORS = {
  'Stocks':           '#3b82f6', // blue
  'Cryptocurrencies': '#8b5cf6', // violet
  'Real Assets':      '#f59e0b', // amber
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback palette  (for any symbol/name not in the maps above)
// 12 distinct, visually professional hues — none duplicate the map above.
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_PALETTE = [
  '#06b6d4', '#10b981', '#ec4899', '#f43f5e',
  '#a78bfa', '#34d399', '#fb923c', '#60a5fa',
  '#e879f9', '#4ade80', '#fbbf24', '#38bdf8',
];

// Stable fallback: hash the key so the same unknown asset always gets the
// same fallback color across page reloads.
const hashIndex = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % FALLBACK_PALETTE.length;
};

// ─────────────────────────────────────────────────────────────────────────────
// Primary lookup function — use this everywhere
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns a fixed hex color for any asset key.
 *
 * @param {string} key  Symbol ("BTC"), full name ("Bitcoin"),
 *                      or asset-class label ("Stocks").
 * @returns {string}    Hex color string, e.g. "#f7931a"
 */
export const getAssetColor = (key) => {
  if (!key) return FALLBACK_PALETTE[0];

  const upper = key.trim().toUpperCase();
  const lower = key.trim().toLowerCase();

  // 1. Direct symbol lookup
  if (SYMBOL_COLORS[upper]) return SYMBOL_COLORS[upper];

  // 2. Asset-class label lookup
  if (CLASS_COLORS[key.trim()]) return CLASS_COLORS[key.trim()];

  // 3. Full-name lookup (case-insensitive)
  const symbol = NAME_TO_SYMBOL[lower];
  if (symbol && SYMBOL_COLORS[symbol]) return SYMBOL_COLORS[symbol];

  // 4. Stable fallback for any unlisted asset
  return FALLBACK_PALETTE[hashIndex(upper)];
};

/**
 * Returns an array of colors for a data array.
 * Tries `entry.symbol` first, then `entry.name`, then the index fallback.
 *
 * @param {Array<{symbol?: string, name?: string}>} dataArray
 * @returns {string[]}
 */
export const getColorArray = (dataArray) =>
  dataArray.map((entry) => getAssetColor(entry.symbol || entry.name || ''));
