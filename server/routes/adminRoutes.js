import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import AssetLimit from '../models/AssetLimit.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Holding from '../models/Holding.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Settings from '../models/Settings.js';

const router = express.Router();
const ADMIN_EMAIL = 'eitishkoundal34@gmail.com';

// Admin middleware that checks if email matches ADMIN_EMAIL
const adminOnly = (req, res, next) => {
  if (req.user && req.user.email === ADMIN_EMAIL) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin authorization required' });
  }
};

// GET /api/admin/assets - return all asset limits
router.get('/assets', protect, adminOnly, async (req, res) => {
  try {
    const assets = await AssetLimit.find({}).sort({ createdAt: -1 });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/assets - create new asset limit, set remainingQuantity equal to totalQuantity
router.post('/assets', protect, adminOnly, async (req, res) => {
  try {
    const { symbol, name, assetType, totalQuantity } = req.body;

    if (!symbol || !name || !assetType || totalQuantity === undefined || totalQuantity === null) {
      return res.status(400).json({ message: 'All fields (symbol, name, assetType, totalQuantity) are required' });
    }

    const uppercaseSymbol = symbol.toUpperCase();
    const assetExists = await AssetLimit.findOne({ symbol: uppercaseSymbol });

    if (assetExists) {
      return res.status(400).json({ message: `Asset limit already exists for symbol: ${uppercaseSymbol}` });
    }

    const newAsset = await AssetLimit.create({
      symbol: uppercaseSymbol,
      name,
      assetType,
      totalQuantity: Number(totalQuantity),
      remainingQuantity: Number(totalQuantity),
    });

    res.status(201).json(newAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/assets/:symbol - update totalQuantity, adjust remainingQuantity by the difference
router.put('/assets/:symbol', protect, adminOnly, async (req, res) => {
  try {
    const { totalQuantity, name, assetType } = req.body;
    const uppercaseSymbol = req.params.symbol.toUpperCase();

    if (totalQuantity === undefined || totalQuantity === null) {
      return res.status(400).json({ message: 'totalQuantity is required to update' });
    }

    const assetLimit = await AssetLimit.findOne({ symbol: uppercaseSymbol });

    if (!assetLimit) {
      return res.status(404).json({ message: `Asset limit for symbol ${uppercaseSymbol} not found` });
    }

    const newTotal = Number(totalQuantity);
    const diff = newTotal - assetLimit.totalQuantity;

    assetLimit.totalQuantity = newTotal;
    assetLimit.remainingQuantity += diff;

    // Optional: Allow updating name and assetType if they are passed in the request body
    if (name) assetLimit.name = name;
    if (assetType) assetLimit.assetType = assetType;

    await assetLimit.save();

    res.json(assetLimit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/assets/:symbol - remove asset limit
router.delete('/assets/:symbol', protect, adminOnly, async (req, res) => {
  try {
    const uppercaseSymbol = req.params.symbol.toUpperCase();
    const assetLimit = await AssetLimit.findOne({ symbol: uppercaseSymbol });

    if (!assetLimit) {
      return res.status(404).json({ message: `Asset limit for symbol ${uppercaseSymbol} not found` });
    }

    await AssetLimit.deleteOne({ symbol: uppercaseSymbol });

    res.json({ message: `Asset limit for symbol ${uppercaseSymbol} removed successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/stats - return platform statistics and charts data
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    
    // Active today: unique users with trades or wallet transactions in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeTradesUsers = await Transaction.find({ createdAt: { $gte: oneDayAgo } }).distinct('userId');
    const activeWalletUsers = await WalletTransaction.find({ createdAt: { $gte: oneDayAgo } }).distinct('userId');
    const uniqueActive = new Set([...activeTradesUsers.map(id => id.toString()), ...activeWalletUsers.map(id => id.toString())]);
    const activeUsersCount = uniqueActive.size;

    // Total Trades Today
    const totalTradesToday = await Transaction.countDocuments({ createdAt: { $gte: oneDayAgo } });

    // Platform Volume (Sum of all trade totalAmounts)
    const allTrades = await Transaction.find({});
    const platformVolume = allTrades.reduce((acc, t) => acc + t.totalAmount, 0);

    // Fees Collected (simulated at current fee rate, default 0.15%)
    const settings = await Settings.getSettings();
    const feeRate = settings.tradingFeePercent / 100;
    const feesCollected = platformVolume * feeRate;

    // Pending Withdrawals
    const pendingWithdrawalsCount = await WalletTransaction.countDocuments({
      transactionType: 'DEBIT',
      status: 'pending',
      description: { $not: /^Bought/ }
    });

    // Top 5 most traded assets this week
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTrades = await Transaction.find({ createdAt: { $gte: sevenDaysAgo } });
    const assetStats = {};
    recentTrades.forEach(t => {
      if (!assetStats[t.symbol]) {
        assetStats[t.symbol] = { symbol: t.symbol, volume: 0, count: 0 };
      }
      assetStats[t.symbol].volume += t.totalAmount;
      assetStats[t.symbol].count += 1;
    });
    const topAssets = Object.values(assetStats)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
      .map((item, idx) => ({
        rank: idx + 1,
        symbol: item.symbol,
        volume: item.volume,
        tradesCount: item.count
      }));

    // Volume last 7 days (Bar chart)
    const volumeLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      const dayTrades = await Transaction.find({ createdAt: { $gte: d, $lt: nextD } });
      const dayVolume = dayTrades.reduce((acc, t) => acc + t.totalAmount, 0);
      volumeLast7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        volume: dayVolume
      });
    }

    // New signups last 7 days (Line chart)
    const signupsLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      const count = await User.countDocuments({ createdAt: { $gte: d, $lt: nextD } });
      signupsLast7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        signups: count
      });
    }

    res.json({
      totalUsers,
      activeToday: activeUsersCount || 1, // Fallback to 1 (admin)
      totalTradesToday,
      platformVolume,
      feesCollected,
      pendingWithdrawals: pendingWithdrawalsCount,
      topAssets,
      volumeLast7Days,
      signupsLast7Days
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/users - return list of all users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    const usersWithDetails = await Promise.all(users.map(async (u) => {
      const holdingsCount = await Holding.countDocuments({ userId: u._id });
      const tradeCount = await Transaction.countDocuments({ userId: u._id });
      
      // Seed deterministic KYC status
      const seed = parseInt(u._id.toString().slice(-4), 16);
      const kycStatusOptions = ['Verified', 'Pending', 'Not Started'];
      const kycStatus = u.email === ADMIN_EMAIL ? 'Verified' : kycStatusOptions[seed % 3];

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        status: u.status || 'active',
        kycStatus,
        createdAt: u.createdAt,
        holdingsCount,
        tradeCount,
      };
    }));
    res.json(usersWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/users/:id/status - update user account status
router.put('/users/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({ message: `User status updated to ${status} successfully`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/admin/users/:id/reset-2fa - reset 2FA for a user (mock)
router.post('/users/:id/reset-2fa', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: `2FA authentication reset successful for ${user.name} (${user.email})` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/users/:id/profile - get user profile data (holdings, trade history, wallet history)
router.get('/users/:id/profile', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const holdings = await Holding.find({ userId: user._id });
    const trades = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });
    const walletTxs = await WalletTransaction.find({ userId: user._id }).sort({ createdAt: -1 });

    res.json({
      user,
      holdings,
      trades,
      walletTxs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/orders - get all trade transactions across the platform
router.get('/orders', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Transaction.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/admin/orders/:id - cancel a trade order
router.delete('/orders/:id', protect, adminOnly, async (req, res) => {
  try {
    const trade = await Transaction.findById(req.params.id);
    if (!trade) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Try to find the associated asset limit and restore quantity
    const assetLimit = await AssetLimit.findOne({ symbol: trade.symbol });
    if (assetLimit && trade.type === 'BUY') {
      assetLimit.remainingQuantity += trade.quantity;
      await assetLimit.save();
    }

    await Transaction.deleteOne({ _id: trade._id });
    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/withdrawals - get all withdrawal transactions (DEBIT type, excluding trades)
router.get('/withdrawals', protect, adminOnly, async (req, res) => {
  try {
    const withdrawals = await WalletTransaction.find({
      transactionType: 'DEBIT',
      description: { $not: /^Bought/ }
    })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/withdrawals/:id/status - approve, reject, or hold a withdrawal request
router.put('/withdrawals/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['pending', 'approved', 'rejected', 'on_hold'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const tx = await WalletTransaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ message: 'Withdrawal transaction not found' });
    }

    tx.status = status;
    if (reason) {
      tx.description = `${tx.description.split(' (Reason:')[0]} (Reason: ${reason})`;
    }
    await tx.save();

    res.json({ message: `Withdrawal successfully updated to ${status}`, transaction: tx });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/settings - get platform settings
router.get('/settings', protect, adminOnly, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/admin/settings - update platform settings
router.put('/settings', protect, adminOnly, async (req, res) => {
  try {
    const { tradingFeePercent, maintenanceMode, userTiers } = req.body;
    const settings = await Settings.getSettings();

    if (tradingFeePercent !== undefined) {
      settings.tradingFeePercent = Number(tradingFeePercent);
    }
    if (maintenanceMode !== undefined) {
      settings.maintenanceMode = Boolean(maintenanceMode);
    }
    if (userTiers !== undefined && Array.isArray(userTiers)) {
      settings.userTiers = userTiers;
    }

    await settings.save();
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
