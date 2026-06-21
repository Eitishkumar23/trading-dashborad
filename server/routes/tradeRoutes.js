import express from 'express';
import { buyAsset, sellAsset, getTransactionHistory } from '../controllers/tradeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/buy', buyAsset);
router.post('/sell', sellAsset);
router.get('/history', getTransactionHistory);

export default router;
