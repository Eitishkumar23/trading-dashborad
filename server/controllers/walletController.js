import WalletTransaction from '../models/WalletTransaction.js';

// @desc    Add funds to wallet (CREDIT)
// @route   POST /api/wallet/add
// @access  Private
export const addFunds = async (req, res) => {
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const transaction = await WalletTransaction.create({
      userId: req.user._id,
      transactionType: 'CREDIT',
      amount,
      description: description || 'Added funds via Net Banking/Card',
    });

    // Recalculate balance to return
    const ledger = await WalletTransaction.find({ userId: req.user._id });
    let totalCredits = 0;
    let totalDebits = 0;
    ledger.forEach((tx) => {
      if (tx.transactionType === 'CREDIT') totalCredits += tx.amount;
      else if (tx.transactionType === 'DEBIT') totalDebits += tx.amount;
    });

    res.status(201).json({
      message: 'Funds added successfully',
      transaction,
      balance: totalCredits - totalDebits,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get wallet balance & ledger details
// @route   GET /api/wallet/balance
// @access  Private
export const getWalletDetails = async (req, res) => {
  try {
    const ledger = await WalletTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    let totalCredits = 0;
    let totalDebits = 0;
    
    ledger.forEach((tx) => {
      if (tx.transactionType === 'CREDIT') totalCredits += tx.amount;
      else if (tx.transactionType === 'DEBIT') totalDebits += tx.amount;
    });

    const balance = totalCredits - totalDebits;

    res.json({
      balance,
      totalCredits,
      totalDebits,
      history: ledger,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
