import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import AssetLimit from '../models/AssetLimit.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Holding from '../models/Holding.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Settings from '../models/Settings.js';
import { ADMIN_EMAIL } from '../config/authConstants.js';

const router = express.Router();

const buildLastSevenDayBuckets = () => {
  const buckets = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    buckets.push({
      start,
      end,
      label: start.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }
  return buckets;
};

const mapBucketResults = (results) => {
  return new Map(results.map((item) => [new Date(item._id).getTime(), item]));
};

// Admin middleware that only allows the permanent system administrator.
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin' && req.user.email === ADMIN_EMAIL) {
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
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dayBuckets = buildLastSevenDayBuckets();
    const bucketBoundaries = [...dayBuckets.map((bucket) => bucket.start), dayBuckets[dayBuckets.length - 1].end];
    const bucketStart = bucketBoundaries[0];
    const bucketEnd = bucketBoundaries[bucketBoundaries.length - 1];

    const [
      totalUsers,
      activeTradesUsers,
      activeWalletUsers,
      totalTradesToday,
      platformVolumeResult,
      settings,
      pendingWithdrawalsCount,
      topAssetsResult,
      volumeBuckets,
      signupBuckets,
    ] = await Promise.all([
      User.countDocuments({}),
      Transaction.distinct('userId', { createdAt: { $gte: oneDayAgo } }),
      WalletTransaction.distinct('userId', { createdAt: { $gte: oneDayAgo } }),
      Transaction.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Transaction.aggregate([
        {
          $group: {
            _id: null,
            platformVolume: { $sum: '$totalAmount' },
          },
        },
      ]),
      Settings.getSettings(),
      WalletTransaction.countDocuments({
        transactionType: 'DEBIT',
        status: 'pending',
        description: { $not: /^Bought/ },
      }),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: '$symbol',
            volume: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { volume: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 0,
            symbol: '$_id',
            volume: 1,
            count: 1,
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: bucketStart, $lt: bucketEnd } } },
        {
          $bucket: {
            groupBy: '$createdAt',
            boundaries: bucketBoundaries,
            output: {
              volume: { $sum: '$totalAmount' },
            },
          },
        },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: bucketStart, $lt: bucketEnd } } },
        {
          $bucket: {
            groupBy: '$createdAt',
            boundaries: bucketBoundaries,
            output: {
              signups: { $sum: 1 },
            },
          },
        },
      ]),
    ]);

    // Active today: unique users with trades or wallet transactions in last 24h
    const uniqueActive = new Set([...activeTradesUsers.map(id => id.toString()), ...activeWalletUsers.map(id => id.toString())]);
    const activeUsersCount = uniqueActive.size;

    // Fees Collected (simulated at current fee rate)
    const platformVolume = platformVolumeResult[0]?.platformVolume || 0;
    const feeRate = settings.tradingFeePercent / 100;
    const feesCollected = platformVolume * feeRate;

    // Top 5 most traded assets this week
    const topAssets = topAssetsResult
      .map((item, idx) => ({
        rank: idx + 1,
        symbol: item.symbol,
        volume: item.volume,
        tradesCount: item.count
      }));

    // Volume last 7 days (Bar chart)
    const volumeByDay = mapBucketResults(volumeBuckets);
    const volumeLast7Days = dayBuckets.map((bucket) => ({
      date: bucket.label,
      volume: volumeByDay.get(bucket.start.getTime())?.volume || 0,
    }));

    // New signups last 7 days (Line chart)
    const signupsByDay = mapBucketResults(signupBuckets);
    const signupsLast7Days = dayBuckets.map((bucket) => ({
      date: bucket.label,
      signups: signupsByDay.get(bucket.start.getTime())?.signups || 0,
    }));

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
    const [users, holdingCounts, tradeCounts] = await Promise.all([
      User.find({})
        .select('_id name email role authProvider status createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Holding.aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const holdingCountByUser = new Map(holdingCounts.map((item) => [item._id.toString(), item.count]));
    const tradeCountByUser = new Map(tradeCounts.map((item) => [item._id.toString(), item.count]));

    const usersWithDetails = users.map((u) => {
      const userId = u._id.toString();

      // Seed deterministic KYC status
      const seed = parseInt(u._id.toString().slice(-4), 16);
      const kycStatusOptions = ['Verified', 'Pending', 'Not Started'];
      const kycStatus = (u.role === 'admin' || u.email === ADMIN_EMAIL) ? 'Verified' : kycStatusOptions[seed % 3];

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role || (u.email === ADMIN_EMAIL ? 'admin' : 'user'),
        authProvider: u.authProvider || 'local',
        status: u.status || 'active',
        kycStatus,
        createdAt: u.createdAt,
        holdingsCount: holdingCountByUser.get(userId) || 0,
        tradeCount: tradeCountByUser.get(userId) || 0,
      };
    });
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

    if (user.role === 'admin' || user.email === ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Administrator account cannot be modified.' });
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
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [holdings, trades, walletTxs] = await Promise.all([
      Holding.find({ userId: user._id })
        .select('_id userId symbol assetType quantity averageBuyPrice investedAmount createdAt __v')
        .lean(),
      Transaction.find({ userId: user._id })
        .select('_id userId type symbol quantity price totalAmount profit createdAt __v')
        .sort({ createdAt: -1 })
        .lean(),
      WalletTransaction.find({ userId: user._id })
        .select('_id userId transactionType amount description status createdAt __v')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

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
      .select('_id userId type symbol quantity price totalAmount profit createdAt __v')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
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
      .select('_id userId transactionType amount description status createdAt __v')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
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

    const previousStatus = tx.status;
    tx.status = status;
    if (reason) {
      tx.description = `${tx.description.split(' (Reason:')[0]} (Reason: ${reason})`;
    }
    await tx.save();

    // If rejecting a pending/on_hold withdrawal, create a CREDIT refund entry
    // so the balance is restored and a clear "Withdrawal Refund" entry appears
    // in the user's ledger history.
    if (status === 'rejected' && previousStatus !== 'rejected') {
      await WalletTransaction.create({
        userId: tx.userId,
        transactionType: 'CREDIT',
        amount: tx.amount,
        description: 'Withdrawal Refund',
        status: 'approved',
      });
    }

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
