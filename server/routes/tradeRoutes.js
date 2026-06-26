import express from 'express';
import { buyAsset, sellAsset, getTransactionHistory } from '../controllers/tradeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWritablePlatform } from '../middleware/maintenanceMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/buy', requireWritablePlatform, buyAsset);
router.post('/sell', requireWritablePlatform, sellAsset);
router.get('/history', getTransactionHistory);

export default router;
