import express from 'express';
import {
  getMarkets,
  searchMarkets,
  getMarketOverview,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getAlerts,
  createAlert,
  deleteAlert,
} from '../controllers/marketController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWritablePlatform } from '../middleware/maintenanceMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getMarkets);
router.get('/search', searchMarkets);
router.get('/overview', getMarketOverview);

// Watchlist routes
router.get('/watchlist', getWatchlist);
router.post('/watchlist', requireWritablePlatform, addToWatchlist);
router.delete('/watchlist/:symbol', requireWritablePlatform, removeFromWatchlist);

// Price Alerts routes
router.get('/alerts', getAlerts);
router.post('/alerts', requireWritablePlatform, createAlert);
router.delete('/alerts/:id', requireWritablePlatform, deleteAlert);

export default router;
