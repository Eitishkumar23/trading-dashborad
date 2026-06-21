import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';

// Model imports (for seeding)
import User from './models/User.js';
import Holding from './models/Holding.js';
import Transaction from './models/Transaction.js';
import WalletTransaction from './models/WalletTransaction.js';
import Watchlist from './models/Watchlist.js';
import Alert from './models/Alert.js';

dotenv.config();
console.log(process.env.MONGO_URI);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/portfolio', portfolioRoutes);

// @desc    Seed demo database profile
// @route   POST /api/seed
// @access  Public
app.post('/api/seed', async (req, res) => {
  try {
    // 1. Clear existing database for clean seeding
    await User.deleteMany({});
    await Holding.deleteMany({});
    await Transaction.deleteMany({});
    await WalletTransaction.deleteMany({});
    await Watchlist.deleteMany({});
    await Alert.deleteMany({});

    // 2. Create demo user (password is automatically hashed by Mongoose schema pre-save hook)
    const demoUser = await User.create({
      name: 'Demo Trader',
      email: 'demo@trading.com',
      password: 'password123',
    });

    const userId = demoUser._id;

    // 3. Create wallet credits (deposits) and debits (asset buys)
    // Ledger total credits: 5,00,000 + 2,50,000 = 7,50,000
    // Ledger total debits: 2,92,500 (BTC) + 1,53,500 (AAPL) + 1,77,000 (SOL) = 6,23,000
    // Net ledger balance: 7,50,000 - 6,23,000 = 1,27,000
    await WalletTransaction.insertMany([
      { userId, transactionType: 'CREDIT', amount: 500000, description: 'Initial Funding Deposit' },
      { userId, transactionType: 'CREDIT', amount: 250000, description: 'NetBanking Quick Deposit' },
      { userId, transactionType: 'DEBIT', amount: 292500, description: 'Bought 0.05 BTC at ₹58,50,000' },
      { userId, transactionType: 'DEBIT', amount: 153500, description: 'Bought 10 AAPL at ₹15,350' },
      { userId, transactionType: 'DEBIT', amount: 177000, description: 'Bought 15 SOL at ₹11,800' },
    ]);

    // 4. Create active holdings
    const holdings = await Holding.insertMany([
      { userId, symbol: 'BTC', assetType: 'CRYPTO', quantity: 0.05, averageBuyPrice: 5850000, investedAmount: 292500 },
      { userId, symbol: 'AAPL', assetType: 'STOCK', quantity: 10, averageBuyPrice: 15350, investedAmount: 153500 },
      { userId, symbol: 'SOL', assetType: 'CRYPTO', quantity: 15, averageBuyPrice: 11800, investedAmount: 177000 },
    ]);

    // 5. Create transaction history logs
    await Transaction.insertMany([
      { userId, type: 'BUY', symbol: 'BTC', quantity: 0.05, price: 5850000, totalAmount: 292500 },
      { userId, type: 'BUY', symbol: 'AAPL', quantity: 10, price: 15350, totalAmount: 153500 },
      { userId, type: 'BUY', symbol: 'SOL', quantity: 15, price: 11800, totalAmount: 177000 },
    ]);

    // 6. Seed Watchlist symbols
    await Watchlist.insertMany([
      { userId, symbol: 'BTC', assetType: 'CRYPTO' },
      { userId, symbol: 'AAPL', assetType: 'STOCK' },
      { userId, symbol: 'TSLA', assetType: 'STOCK' },
      { userId, symbol: 'ETH', assetType: 'CRYPTO' },
    ]);

    // 7. Seed Price Alerts
    await Alert.insertMany([
      { userId, symbol: 'BTC', condition: 'ABOVE', value: 6500000 },
      { userId, symbol: 'TSLA', condition: 'BELOW', value: 14000 },
    ]);

    res.status(201).json({
      message: 'Demo database seeded successfully!',
      demoUser: {
        email: 'demo@trading.com',
        password: 'password123',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('AI Trading Portfolio Management API is running...');
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
  });
});
