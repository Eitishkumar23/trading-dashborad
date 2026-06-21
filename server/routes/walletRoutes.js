import express from 'express';
import { addFunds, getWalletDetails } from '../controllers/walletController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/add', addFunds);
router.get('/details', getWalletDetails);

export default router;
