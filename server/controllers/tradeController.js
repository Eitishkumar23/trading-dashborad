import Holding from '../models/Holding.js';
import Transaction from '../models/Transaction.js';
import WalletTransaction from '../models/WalletTransaction.js';
import AssetLimit from '../models/AssetLimit.js';
import Settings from '../models/Settings.js';

// Helper to get wallet balance
const getBalanceHelper = async (userId) => {
  const ledger = await WalletTransaction.find({ userId });
  let totalCredits = 0;
  let totalDebits = 0;
  ledger.forEach((tx) => {
    if (tx.transactionType === 'CREDIT' && tx.status !== 'rejected') totalCredits += tx.amount;
    else if (tx.transactionType === 'DEBIT' && tx.status !== 'rejected') totalDebits += tx.amount;
  });
  return totalCredits - totalDebits;
};

// @desc    Buy an asset (Stock or Crypto)
// @route   POST /api/trade/buy
// @access  Private
export const buyAsset = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (settings.maintenanceMode) {
      return res.status(503).json({ message: 'Trading is temporarily suspended for system maintenance. Please try again later.' });
    }

    const { symbol, assetType, quantity, price } = req.body;

    if (!symbol || !assetType || !quantity || !price || quantity <= 0 || price <= 0) {
      return res.status(400).json({ message: 'Invalid trade input details' });
    }

    const assetLimit = await AssetLimit.findOne({ symbol: symbol.toUpperCase() });
    if (assetLimit && assetLimit.remainingQuantity < quantity) {
      return res.status(400).json({ message: 'Insufficient asset availability' });
    }

    const totalCost = quantity * price;
    const currentBalance = await getBalanceHelper(req.user._id);

    if (currentBalance < totalCost) {
      return res.status(400).json({ message: `Insufficient funds. Cost is ₹${totalCost.toLocaleString()}, but wallet balance is ₹${currentBalance.toLocaleString()}` });
    }

    // 1. Record wallet debit
    await WalletTransaction.create({
      userId: req.user._id,
      transactionType: 'DEBIT',
      amount: totalCost,
      description: `Bought ${quantity} ${symbol.toUpperCase()} at ₹${price.toLocaleString()}`,
    });

    // 2. Manage Holdings (Maintain average buy price)
    let holding = await Holding.findOne({ userId: req.user._id, symbol: symbol.toUpperCase() });

    if (holding) {
      const newQuantity = holding.quantity + quantity;
      const newInvestedAmount = holding.investedAmount + totalCost;
      const newAveragePrice = newInvestedAmount / newQuantity;

      holding.quantity = newQuantity;
      holding.investedAmount = newInvestedAmount;
      holding.averageBuyPrice = newAveragePrice;
      await holding.save();
    } else {
      holding = await Holding.create({
        userId: req.user._id,
        symbol: symbol.toUpperCase(),
        assetType: assetType.toUpperCase(),
        quantity,
        averageBuyPrice: price,
        investedAmount: totalCost,
      });
    }

    // 3. Record Buy Transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'BUY',
      symbol: symbol.toUpperCase(),
      quantity,
      price,
      totalAmount: totalCost,
    });

    if (assetLimit) {
      assetLimit.remainingQuantity -= quantity;
      await assetLimit.save();
    }

    const newWalletBalance = await getBalanceHelper(req.user._id);

    res.status(201).json({
      message: 'Purchase successful',
      holding,
      transaction,
      walletBalance: newWalletBalance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sell an asset (Stock or Crypto)
// @route   POST /api/trade/sell
// @access  Private
export const sellAsset = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (settings.maintenanceMode) {
      return res.status(503).json({ message: 'Trading is temporarily suspended for system maintenance. Please try again later.' });
    }

    const { symbol, quantity, price } = req.body;

    if (!symbol || !quantity || !price || quantity <= 0 || price <= 0) {
      return res.status(400).json({ message: 'Invalid trade input details' });
    }

    const holding = await Holding.findOne({ userId: req.user._id, symbol: symbol.toUpperCase() });

    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient asset quantity to complete this sale' });
    }

    const totalProceeds = quantity * price;
    const costBasis = quantity * holding.averageBuyPrice;
    const realizedProfit = totalProceeds - costBasis;

    // 1. Record wallet credit
    await WalletTransaction.create({
      userId: req.user._id,
      transactionType: 'CREDIT',
      amount: totalProceeds,
      description: `Sold ${quantity} ${symbol.toUpperCase()} at ₹${price.toLocaleString()}`,
    });

    // 2. Update holdings
    if (holding.quantity === quantity) {
      // Sold all shares
      await Holding.deleteOne({ _id: holding._id });
    } else {
      holding.quantity -= quantity;
      holding.investedAmount -= costBasis; // Average buy price remains the same
      await holding.save();
    }

    // 3. Record Sell Transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'SELL',
      symbol: symbol.toUpperCase(),
      quantity,
      price,
      totalAmount: totalProceeds,
      profit: realizedProfit,
    });

    const newWalletBalance = await getBalanceHelper(req.user._id);

    res.status(200).json({
      message: 'Sale successful',
      transaction,
      walletBalance: newWalletBalance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transaction history
// @route   GET /api/trade/history
// @access  Private
export const getTransactionHistory = async (req, res) => {
  try {
    const { filter } = req.query; // today, week, month, year, all
    let query = { userId: req.user._id };

    if (filter && filter !== 'all') {
      const now = new Date();
      let startDate = new Date();

      if (filter === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (filter === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (filter === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (filter === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      query.createdAt = { $gte: startDate };
    }

    const history = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
