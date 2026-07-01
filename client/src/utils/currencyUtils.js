/**
 * currencyUtils.js
 *
 * Centralised currency conversion and formatting for the Trading Dashboard.
 *
 * All backend values are stored and calculated in INR.
 * This module handles display-only conversion so the rest of the app
 * never needs to know the underlying INR value.
 *
 * Exchange rates are intentionally isolated here — swap the RATES object
 * with a live API call whenever you're ready without touching any UI code.
 */

// ---------------------------------------------------------------------------
// Static exchange rates  (1 INR = X <currency>)
// To wire up a live API, replace this object with the fetched rates.
// ---------------------------------------------------------------------------
export const RATES = {
  INR:  1,
  USD:  0.012,
  USDT: 0.012,
  EUR:  0.011,
  GBP:  0.009,
};

// ---------------------------------------------------------------------------
// Metadata for each supported currency
// ---------------------------------------------------------------------------
export const CURRENCY_META = {
  INR:  { symbol: '₹', label: 'INR (₹)',  locale: 'en-IN', code: 'INR'  },
  USD:  { symbol: '$', label: 'USD ($)',   locale: 'en-US', code: 'USD'  },
  USDT: { symbol: '₮', label: 'USDT',     locale: 'en-US', code: 'USDT' },
  EUR:  { symbol: '€', label: 'EUR (€)',   locale: 'de-DE', code: 'EUR'  },
  GBP:  { symbol: '£', label: 'GBP (£)',   locale: 'en-GB', code: 'GBP'  },
};

export const CURRENCY_OPTIONS = Object.values(CURRENCY_META).map((m) => ({
  value: m.code,
  label: m.label,
}));

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Convert an INR amount to the target currency.
 * @param {number} inrAmount  - Raw value in INR (from backend).
 * @param {string} currency   - Target currency code (INR | USD | USDT | EUR | GBP).
 * @returns {number}
 */
export const convertFromINR = (inrAmount, currency = 'INR') => {
  const rate = RATES[currency] ?? 1;
  return Number(inrAmount || 0) * rate;
};

/**
 * Return the currency symbol for a given currency code.
 * @param {string} currency
 * @returns {string}
 */
export const getCurrencySymbol = (currency = 'INR') => {
  return CURRENCY_META[currency]?.symbol ?? '₹';
};

/**
 * Format a converted amount as a display string.
 *
 * @param {number} inrAmount            - Raw INR value from the backend.
 * @param {string} currency             - Target display currency.
 * @param {object} [opts]
 * @param {number} [opts.maximumFractionDigits=2]
 * @param {number} [opts.minimumFractionDigits=0]
 * @param {boolean} [opts.showSign=false]  - Prepend '+' for positive values.
 * @returns {string}  e.g. "₹1,23,456" or "$1,481.47" or "€1,358.02"
 */
export const formatCurrency = (inrAmount, currency = 'INR', opts = {}) => {
  const {
    maximumFractionDigits = 2,
    minimumFractionDigits = 0,
    showSign = false,
  } = opts;

  const converted = convertFromINR(inrAmount, currency);
  const meta = CURRENCY_META[currency] ?? CURRENCY_META.INR;

  // Use Intl for proper locale-aware number formatting
  const formatted = Math.abs(converted).toLocaleString(meta.locale, {
    minimumFractionDigits: Math.min(minimumFractionDigits, maximumFractionDigits),
    maximumFractionDigits: Math.max(minimumFractionDigits, maximumFractionDigits),
  });

  const sign = converted < 0 ? '-' : showSign && converted > 0 ? '+' : '';
  return `${sign}${meta.symbol}${formatted}`;
};

/**
 * Shorthand — format with zero decimal places (good for large totals).
 */
export const formatCurrencyWhole = (inrAmount, currency = 'INR') =>
  formatCurrency(inrAmount, currency, { maximumFractionDigits: 0 });

/**
 * Shorthand — format with exactly two decimal places (good for prices).
 */
export const formatCurrencyDecimal = (inrAmount, currency = 'INR') =>
  formatCurrency(inrAmount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Chart Y-axis tick formatter.
 * Returns a compact string like "₹1.2k", "$14.8", "€11.0k".
 * @param {number} inrValue  - Raw INR value.
 * @param {string} currency
 * @returns {string}
 */
export const formatCurrencyChart = (inrValue, currency = 'INR') => {
  const converted = convertFromINR(inrValue, currency);
  const symbol = getCurrencySymbol(currency);
  if (Math.abs(converted) >= 1000) {
    return `${symbol}${(converted / 1000).toFixed(1)}k`;
  }
  return `${symbol}${converted.toFixed(0)}`;
};
