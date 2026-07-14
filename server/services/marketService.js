import Alert from '../models/Alert.js';
import redis from '../config/redis.js';
import axios from 'axios';

const COINGECKO_MAP = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'solana': 'SOL',
  'dogecoin': 'DOGE',
  'cardano': 'ADA',
  'chainlink': 'LINK',
  'polygon-ecosystem-token': 'POL'
};

const fetchLiveCryptoPrices = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: Object.keys(COINGECKO_MAP).join(','),
        vs_currencies: 'inr',
        include_24hr_change: 'true'
      },
      timeout: 5000
    });

    if (!response || response.status !== 200 || !response.data || typeof response.data !== 'object') {
      return null;
    }

    const data = response.data;
    const result = {};
    for (const [id, symbol] of Object.entries(COINGECKO_MAP)) {
      if (!data[id] || typeof data[id].inr !== 'number' || typeof data[id].inr_24h_change !== 'number') {
        return null;
      }
      result[symbol] = {
        price: data[id].inr,
        change: data[id].inr_24h_change
      };
    }
    return result;
  } catch (error) {
    console.error('[market] Crypto fetch error detail:', error.response?.status, error.message);
    return null;
  }
};

// Approximate fixed USD to INR conversion rate (may drift over time)
const USD_TO_INR = 87;

const STOCK_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'NFLX'];

export const fetchLiveStockPrices = async () => {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return null;
  }

  const results = {};
  let successCount = 0;

  const fetchPromises = STOCK_SYMBOLS.map(async (symbol) => {
    try {
      const response = await axios.get('https://finnhub.io/api/v1/quote', {
        params: {
          symbol: symbol,
          token: token
        },
        timeout: 5000
      });

      if (response && response.status === 200 && response.data) {
        const { c, pc } = response.data;
        if (typeof c === 'number' && c > 0 && typeof pc === 'number' && pc > 0) {
          const priceInINR = parseFloat((c * USD_TO_INR).toFixed(2));
          const changePercent = parseFloat((((c - pc) / pc) * 100).toFixed(2));
          return { symbol, price: priceInINR, change: changePercent };
        }
      }
    } catch (err) {
      // Avoid failing the entire batch, skip just this stock
    }
    return null;
  });

  try {
    const settled = await Promise.allSettled(fetchPromises);
    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value) {
        const { symbol, price, change } = item.value;
        results[symbol] = { price, change };
        successCount++;
      }
    }
  } catch (err) {
    return null;
  }

  if (successCount === 0) {
    return null;
  }
  return results;
};

// Base prices in INR
const INITIAL_ASSETS = [
  // Cryptocurrencies
  { symbol: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO', price: 5850000, change: 1.25, high: 5900000, low: 5780000, volume: 2450000000 },
  { symbol: 'ETH', name: 'Ethereum', assetType: 'CRYPTO', price: 295000, change: -0.45, high: 302000, low: 291000, volume: 1250000000 },
  { symbol: 'SOL', name: 'Solana', assetType: 'CRYPTO', price: 11800, change: 4.82, high: 12200, low: 11100, volume: 850000000 },
  { symbol: 'DOGE', name: 'Dogecoin', assetType: 'CRYPTO', price: 11.2, change: -2.15, high: 11.8, low: 10.9, volume: 450000000 },
  { symbol: 'ADA', name: 'Cardano', assetType: 'CRYPTO', price: 38.5, change: 0.85, high: 39.2, low: 37.8, volume: 150000000 },
  { symbol: 'LINK', name: 'Chainlink', assetType: 'CRYPTO', price: 1250, change: 3.12, high: 1280, low: 1190, volume: 220000000 },
  { symbol: 'POL', name: 'Polygon Ecosystem Token', assetType: 'CRYPTO', price: 7.57, change: -0.8, high: 7.8, low: 7.3, volume: 180000000 },

  // Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', price: 15350, change: 0.85, high: 15500, low: 15200, volume: 65000000 },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetType: 'STOCK', price: 14800, change: -3.42, high: 15400, low: 14600, volume: 98000000 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', assetType: 'STOCK', price: 34800, change: 1.15, high: 35100, low: 34500, volume: 45000000 },
  { symbol: 'NVDA', name: 'Nvidia Corp.', assetType: 'STOCK', price: 10250, change: 6.89, high: 10400, low: 9600, volume: 120000000 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'STOCK', price: 15100, change: -0.92, high: 15350, low: 14950, volume: 55000000 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'STOCK', price: 14200, change: 0.45, high: 14350, low: 14050, volume: 38000000 },
  { symbol: 'META', name: 'Meta Platforms', assetType: 'STOCK', price: 39800, change: 2.34, high: 40200, low: 38900, volume: 42000000 },
  { symbol: 'NFLX', name: 'Netflix Inc.', assetType: 'STOCK', price: 52400, change: -1.12, high: 53200, low: 52000, volume: 18000000 },

  // Real Assets — Precious Metals (price per gram in INR)
  { symbol: 'GOLD', name: 'Gold', assetType: 'REAL_ASSET', category: 'PRECIOUS_METALS', unit: 'gram', price: 7200, change: 0.42, high: 7280, low: 7150, volume: 85000000 },
  { symbol: 'SILVER', name: 'Silver', assetType: 'REAL_ASSET', category: 'PRECIOUS_METALS', unit: 'gram', price: 90, change: -0.31, high: 92, low: 88, volume: 42000000 },
  { symbol: 'PLAT', name: 'Platinum', assetType: 'REAL_ASSET', category: 'PRECIOUS_METALS', unit: 'gram', price: 3100, change: 0.78, high: 3150, low: 3060, volume: 18000000 },

  // Real Assets — Energy
  { symbol: 'CRUDEOIL', name: 'Crude Oil', assetType: 'REAL_ASSET', category: 'ENERGY', unit: 'barrel', price: 6700, change: -1.05, high: 6820, low: 6640, volume: 320000000 },
  { symbol: 'NATGAS', name: 'Natural Gas', assetType: 'REAL_ASSET', category: 'ENERGY', unit: 'MMBtu', price: 250, change: 2.15, high: 258, low: 244, volume: 95000000 },

  // Real Assets — Real Estate (price per unit in INR; fractional ownership supported)
  { symbol: 'RSDNPROP', name: 'Residential Property', assetType: 'REAL_ASSET', category: 'REAL_ESTATE', unit: 'unit', price: 8500000, change: 0.18, high: 8540000, low: 8460000, volume: 5000000 },
  { symbol: 'CMPROP', name: 'Commercial Property', assetType: 'REAL_ASSET', category: 'REAL_ESTATE', unit: 'unit', price: 22000000, change: 0.25, high: 22100000, low: 21900000, volume: 8000000 },
];

// In-memory cache for market prices
let activeAssets = [...INITIAL_ASSETS];

// Tracks the most recent known-good price per symbol, used as the baseline for
// % change calculations when a tick falls back to simulation. Starts at each
// asset's original simulated price, and updates to the real price whenever
// live data is successfully applied — this prevents % change from being
// computed against a stale fake baseline once real prices arrive.
const referencePrice = {};
INITIAL_ASSETS.forEach((a) => {
  referencePrice[a.symbol] = a.price;
});

// Tracks whether live data has been applied at least once per symbol, so we
// know when to reset high/low from the old simulated range to the real range.
const liveAppliedOnce = {};

// Metadata controlling market behaviour
const ASSET_METADATA = {
  BTC: { type: "CRYPTO", volatility: 0.40, limit: 35 },
  ETH: { type: "CRYPTO", volatility: 0.55, limit: 35 },
  SOL: { type: "CRYPTO", volatility: 0.80, limit: 35 },
  DOGE: { type: "CRYPTO", volatility: 1.20, limit: 35 },
  ADA: { type: "CRYPTO", volatility: 0.90, limit: 35 },
  LINK: { type: "CRYPTO", volatility: 0.75, limit: 35 },
  POL: { type: "CRYPTO", volatility: 1.00, limit: 35 },

  AAPL: { type: "STOCK", volatility: 0.15, limit: 15, tech: true },
  TSLA: { type: "STOCK", volatility: 0.45, limit: 15 },
  MSFT: { type: "STOCK", volatility: 0.15, limit: 15, tech: true },
  NVDA: { type: "STOCK", volatility: 0.60, limit: 15, tech: true },
  AMZN: { type: "STOCK", volatility: 0.25, limit: 15 },
  GOOGL: { type: "STOCK", volatility: 0.15, limit: 15, tech: true },
  META: { type: "STOCK", volatility: 0.15, limit: 15, tech: true },
  NFLX: { type: "STOCK", volatility: 0.40, limit: 15 },

  GOLD: { type: "METAL", volatility: 0.05, limit: 8 },
  SILVER: { type: "METAL", volatility: 0.10, limit: 8 },
  PLAT: { type: "METAL", volatility: 0.18, limit: 8 },

  CRUDEOIL: { type: "ENERGY", volatility: 0.35, limit: 20 },
  NATGAS: { type: "ENERGY", volatility: 0.70, limit: 20 },

  RSDNPROP: { type: "REALESTATE", volatility: 0.01, limit: 5 },
  CMPROP: { type: "REALESTATE", volatility: 0.01, limit: 5 },
};

const randomBetween = (min, max) =>
  Math.random() * (max - min) + min;

const getOriginalPrice = (symbol) =>
  INITIAL_ASSETS.find(a => a.symbol === symbol).price;

const clampPrice = (price, symbol) => {
  const meta = ASSET_METADATA[symbol];
  const original = getOriginalPrice(symbol);

  const min = original * (1 - meta.limit / 100);
  const max = original * (1 + meta.limit / 100);

  return Math.min(max, Math.max(min, price));
};

const cryptoTrend = () => {
  if (Math.random() > 0.20) return 0;
  return Math.random() > 0.5 ? 1 : -1;
};

const techTrend = () => {
  if (Math.random() > 0.20) return 0;
  return Math.random() > 0.5 ? 1 : -1;
};

const hasSpike = () => Math.random() < 0.025;

const calculateMovement = (
  asset,
  cryptoBias,
  techBias,
  averageStockChange,
  tick
) => {

  const meta = ASSET_METADATA[asset.symbol];

  if (!meta) return 0;

  let min = -meta.volatility;
  let max = meta.volatility;

  switch (meta.type) {

    case "CRYPTO":

      if (cryptoBias > 0)
        min /= 4;

      if (cryptoBias < 0)
        max /= 4;

      if (hasSpike())
        return (Math.random() > 0.5 ? 1 : -1) * randomBetween(2, 5);

      break;

    case "STOCK":

      if (meta.tech && techBias > 0)
        min /= 4;

      if (meta.tech && techBias < 0)
        max /= 4;

      break;

    case "METAL":

      if (asset.symbol === "GOLD" && averageStockChange < 0) {

        if (Math.random() < 0.7) {

          return randomBetween(0.01, meta.volatility);

        }

      }

      break;

    case "ENERGY":

      if (hasSpike()) {

        return (Math.random() > 0.5 ? 1 : -1) * randomBetween(1.5, 3.5);

      }

      break;

    case "REALESTATE":

      if (tick % 12 !== 0) {

        return 0;

      }

      break;

  }

  return randomBetween(min, max);

};

const CRYPTO_FETCH_INTERVAL_SECONDS = 30; // CoinGecko free tier rate limits — fetch every 30s, not every tick
const STOCK_FETCH_INTERVAL_SECONDS = 15;

// Volatility simulation running in background, with live crypto prices where available
const startMarketSimulation = () => {
  setInterval(async () => {
    let liveCryptoPrices = null;
    const cryptoThrottled = await redis.exists('cryptoFetchLock');
    if (!cryptoThrottled) {
      await redis.set('cryptoFetchLock', '1', 'EX', CRYPTO_FETCH_INTERVAL_SECONDS);
      liveCryptoPrices = await fetchLiveCryptoPrices();
      if (!liveCryptoPrices) {
        console.warn('[market] Live crypto fetch failed this tick — using simulation fallback for crypto.');
      } else {
        console.log('[market] Live crypto fetch succeeded.');
      }
    }

    let liveStockPrices = null;
    const stockThrottled = await redis.exists('stockFetchLock');
    if (!stockThrottled) {
      await redis.set('stockFetchLock', '1', 'EX', STOCK_FETCH_INTERVAL_SECONDS);
      liveStockPrices = await fetchLiveStockPrices();
      if (!liveStockPrices) {
        console.warn('[market] Live stock fetch failed or skipped this tick — using simulation fallback for stocks.');
      } else {
        console.log('[market] Live stock fetch succeeded.');
      }
    }

    activeAssets = activeAssets.map((asset) => {
      const meta = ASSET_METADATA[asset.symbol];
      const isCrypto = meta && meta.type === 'CRYPTO';
      const isStock = meta && meta.type === 'STOCK';

      let newPrice;
      let changeFromStart;
      let usedLive = false;

      if (isCrypto && liveCryptoPrices && liveCryptoPrices[asset.symbol]) {
        // Use real CoinGecko price and 24h change
        newPrice = liveCryptoPrices[asset.symbol].price;
        changeFromStart = liveCryptoPrices[asset.symbol].change;
        usedLive = true;
      } else if (isStock && liveStockPrices && liveStockPrices[asset.symbol]) {
        // Use real Finnhub price and 24h change
        newPrice = liveStockPrices[asset.symbol].price;
        changeFromStart = liveStockPrices[asset.symbol].change;
        usedLive = true;
      } else {
        // Simulate fluctuation of -0.4% to +0.4% (unchanged fallback logic)
        const percentage = (Math.random() * 0.8 - 0.4) / 100;
        const priceChange = asset.price * percentage;
        newPrice = Math.max(0.01, parseFloat((asset.price + priceChange).toFixed(2)));

        // Compare against the most recent known-good reference price, not the
        // original fake simulated starting price — prevents % change from
        // ballooning once live data has replaced the old baseline.
        const basePrice = referencePrice[asset.symbol];
        changeFromStart = ((newPrice - basePrice) / basePrice) * 100;
      }

      let high;
      let low;

      if (usedLive && !liveAppliedOnce[asset.symbol]) {
        // First time live data replaces the old fake baseline for this asset —
        // reset high/low to the real price instead of carrying forward the
        // stale simulated range.
        high = newPrice;
        low = newPrice;
        liveAppliedOnce[asset.symbol] = true;
      } else {
        high = Math.max(asset.high, newPrice);
        low = Math.min(asset.low, newPrice);
      }

      if (usedLive) {
        referencePrice[asset.symbol] = newPrice;
      }

      return {
        ...asset,
        price: newPrice,
        change: parseFloat(changeFromStart.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
      };
    });


    // Check custom user price alerts
    checkAllAlerts();
  }, 5000); // Ticks every 5 seconds
};

// Check all alerts in database against simulated prices
const checkAllAlerts = async () => {
  try {
    const alerts = await Alert.find({ isTriggered: false });
    if (alerts.length === 0) return;

    for (const alert of alerts) {
      const asset = activeAssets.find((a) => a.symbol === alert.symbol);
      if (!asset) continue;

      let triggered = false;
      if (alert.condition === 'ABOVE' && asset.price >= alert.value) {
        triggered = true;
      } else if (alert.condition === 'BELOW' && asset.price <= alert.value) {
        triggered = true;
      }

      if (triggered) {
        alert.isTriggered = true;
        await alert.save();
        console.log(`[ALERT TRIGGERED] User ${alert.userId}: ${alert.symbol} went ${alert.condition.toLowerCase()} ${alert.value}. Current price: ${asset.price}`);
      }
    }
  } catch (error) {
    console.error('Error running price alert check:', error.message);
  }
};

// Initialize the simulation immediately
startMarketSimulation();

export const getAllAssets = () => {
  return activeAssets;
};

export const getAssetBySymbol = (symbol) => {
  return activeAssets.find((a) => a.symbol === symbol.toUpperCase());
};

export const searchAssets = (query) => {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  return activeAssets.filter(
    (a) =>
      a.symbol.toLowerCase().includes(lowerQuery) ||
      a.name.toLowerCase().includes(lowerQuery)
  );
};

export const getTrending = () => {
  // Sort by volume descending as proxy for trending
  return [...activeAssets].sort((a, b) => b.volume - a.volume).slice(0, 5);
};

export const getGainers = () => {
  return [...activeAssets].sort((a, b) => b.change - a.change).slice(0, 5);
};

export const getLosers = () => {
  return [...activeAssets].sort((a, b) => a.change - b.change).slice(0, 5);
};
