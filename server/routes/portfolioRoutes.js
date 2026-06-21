import express from 'express';
import { getPortfolioHoldings, getDashboardData } from '../controllers/portfolioController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/holdings', getPortfolioHoldings);
router.get('/dashboard', getDashboardData);

export default router;
