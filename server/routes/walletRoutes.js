import express from 'express';
import { addFunds, getWalletDetails, withdrawFunds } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWritablePlatform } from '../middleware/maintenanceMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/add', requireWritablePlatform, addFunds);
router.post('/withdraw', withdrawFunds);
router.get('/details', getWalletDetails);

export default router;
