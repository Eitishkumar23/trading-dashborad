import Watchlist from '../models/Watchlist.js';
import Alert from '../models/Alert.js';
import * as marketService from '../services/marketService.js';

// @desc    Get all active assets (stocks & cryptos) with current prices
// @route   GET /api/market
// @access  Private
export const getMarkets = async (req, res) => {
  try {
    const assets = marketService.getAllAssets();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search assets by query
// @route   GET /api/market/search
// @access  Private
export const searchMarkets = async (req, res) => {
  try {
    const { q } = req.query;
    const results = marketService.searchAssets(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get trending and top moving assets
// @route   GET /api/market/overview
// @access  Private
export const getMarketOverview = async (req, res) => {
  try {
    const trending = marketService.getTrending();
    const gainers = marketService.getGainers();
    const losers = marketService.getLosers();
    res.json({ trending, gainers, losers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's watchlist symbols with current prices
// @route   GET /api/market/watchlist
// @access  Private
export const getWatchlist = async (req, res) => {
  try {
    const watchlistItems = await Watchlist.find({ userId: req.user._id });
    const symbols = watchlistItems.map((item) => item.symbol);
    
    // Enrich with live prices
    const enriched = watchlistItems.map((item) => {
      const liveData = marketService.getAssetBySymbol(item.symbol);
      return {
        _id: item._id,
        symbol: item.symbol,
        assetType: item.assetType,
        live: liveData || null,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add symbol to watchlist
// @route   POST /api/market/watchlist
// @access  Private
export const addToWatchlist = async (req, res) => {
  try {
    const { symbol, assetType } = req.body;

    if (!symbol || !assetType) {
      return res.status(400).json({ message: 'Symbol and asset type are required' });
    }

    const upperSymbol = symbol.toUpperCase();
    const asset = marketService.getAssetBySymbol(upperSymbol);
    if (!asset) {
      return res.status(404).json({ message: `Asset ${upperSymbol} not found in market` });
    }

    const itemExists = await Watchlist.findOne({ userId: req.user._id, symbol: upperSymbol });
    if (itemExists) {
      return res.status(400).json({ message: 'Asset already in watchlist' });
    }

    const watchlistItem = await Watchlist.create({
      userId: req.user._id,
      symbol: upperSymbol,
      assetType: assetType.toUpperCase(),
    });

    res.status(201).json(watchlistItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove symbol from watchlist
// @route   DELETE /api/market/watchlist/:symbol
// @access  Private
export const removeFromWatchlist = async (req, res) => {
  try {
    const { symbol } = req.params;
    await Watchlist.deleteOne({ userId: req.user._id, symbol: symbol.toUpperCase() });
    res.json({ message: 'Asset removed from watchlist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's price alerts
// @route   GET /api/market/alerts
// @access  Private
export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Enrich with live price
    const enriched = alerts.map((alert) => {
      const liveData = marketService.getAssetBySymbol(alert.symbol);
      return {
        _id: alert._id,
        symbol: alert.symbol,
        condition: alert.condition,
        value: alert.value,
        isTriggered: alert.isTriggered,
        currentPrice: liveData ? liveData.price : null,
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create price alert
// @route   POST /api/market/alerts
// @access  Private
export const createAlert = async (req, res) => {
  try {
    const { symbol, condition, value } = req.body;

    if (!symbol || !condition || !value || value <= 0) {
      return res.status(400).json({ message: 'Invalid alert details' });
    }

    const upperSymbol = symbol.toUpperCase();
    const asset = marketService.getAssetBySymbol(upperSymbol);
    if (!asset) {
      return res.status(404).json({ message: `Asset ${upperSymbol} not found in market` });
    }

    const alert = await Alert.create({
      userId: req.user._id,
      symbol: upperSymbol,
      condition: condition.toUpperCase(),
      value,
    });

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete price alert
// @route   DELETE /api/market/alerts/:id
// @access  Private
export const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    await Alert.deleteOne({ _id: id, userId: req.user._id });
    res.json({ message: 'Alert removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
