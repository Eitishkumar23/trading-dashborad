import Alert from '../models/Alert.js';

// Base prices in INR
const INITIAL_ASSETS = [
  // Cryptocurrencies
  { symbol: 'BTC', name: 'Bitcoin', assetType: 'CRYPTO', price: 5850000, change: 1.25, high: 5900000, low: 5780000, volume: 2450000000 },
  { symbol: 'ETH', name: 'Ethereum', assetType: 'CRYPTO', price: 295000, change: -0.45, high: 302000, low: 291000, volume: 1250000000 },
  { symbol: 'SOL', name: 'Solana', assetType: 'CRYPTO', price: 11800, change: 4.82, high: 12200, low: 11100, volume: 850000000 },
  { symbol: 'DOGE', name: 'Dogecoin', assetType: 'CRYPTO', price: 11.2, change: -2.15, high: 11.8, low: 10.9, volume: 450000000 },
  { symbol: 'ADA', name: 'Cardano', assetType: 'CRYPTO', price: 38.5, change: 0.85, high: 39.2, low: 37.8, volume: 150000000 },
  { symbol: 'LINK', name: 'Chainlink', assetType: 'CRYPTO', price: 1250, change: 3.12, high: 1280, low: 1190, volume: 220000000 },
  { symbol: 'MATIC', name: 'Polygon', assetType: 'CRYPTO', price: 52.4, change: -1.8, high: 54.1, low: 51.2, volume: 180000000 },

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

// In-memory cache for live prices
let activeAssets = [...INITIAL_ASSETS];

// Volatility simulation running in background
const startMarketSimulation = () => {
  setInterval(() => {
    activeAssets = activeAssets.map((asset) => {
      // Simulate fluctuation of -0.4% to +0.4%
      const percentage = (Math.random() * 0.8 - 0.4) / 100;
      const priceChange = asset.price * percentage;
      const newPrice = Math.max(0.01, parseFloat((asset.price + priceChange).toFixed(2)));

      // Cumulative change logic
      const originalPrice = INITIAL_ASSETS.find((a) => a.symbol === asset.symbol).price;
      const changeFromStart = ((newPrice - originalPrice) / originalPrice) * 100;

      // High/Low tracking
      const high = Math.max(asset.high, newPrice);
      const low = Math.min(asset.low, newPrice);

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
