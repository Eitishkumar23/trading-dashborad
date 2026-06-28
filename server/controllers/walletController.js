import WalletTransaction from '../models/WalletTransaction.js';

/**
 * Balance calculation helper.
 *
 * Rules:
 *   CREDIT – counted unless status = 'rejected'
 *   DEBIT  – always counted (including rejected ones), so that a corresponding
 *             "Withdrawal Refund" CREDIT entry correctly restores the balance
 *             without double-counting.
 */
const calcBalance = (ledger) => {
  let totalCredits = 0;
  let totalDebits = 0;
  ledger.forEach((tx) => {
    if (tx.transactionType === 'CREDIT' && tx.status !== 'rejected') {
      totalCredits += tx.amount;
    } else if (tx.transactionType === 'DEBIT') {
      totalDebits += tx.amount;
    }
  });
  return { totalCredits, totalDebits, balance: totalCredits - totalDebits };
};

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

    const ledger = await WalletTransaction.find({ userId: req.user._id });
    const { totalCredits, totalDebits, balance } = calcBalance(ledger);

    res.status(201).json({
      message: 'Funds added successfully',
      transaction,
      balance,
      totalCredits,
      totalDebits,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get wallet balance & ledger details
// @route   GET /api/wallet/details
// @access  Private
export const getWalletDetails = async (req, res) => {
  try {
    const ledger = await WalletTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const { totalCredits, totalDebits, balance } = calcBalance(ledger);

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

// @desc    Withdraw funds from wallet
//          Creates a DEBIT entry with status = 'pending'.
//          The amount is immediately reserved (deducted from balance).
//          Admin can approve → status becomes 'approved' (no further change).
//          Admin can reject → status becomes 'rejected' AND a CREDIT
//          "Withdrawal Refund" entry is created to restore the balance.
// @route   POST /api/wallet/withdraw
// @access  Private
export const withdrawFunds = async (req, res) => {
  try {
    const { amount, destination } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const ledger = await WalletTransaction.find({ userId: req.user._id });
    const { balance: currentBalance } = calcBalance(ledger);

    if (currentBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance for withdrawal' });
    }

    // Create DEBIT with pending status — amount is immediately reserved
    const transaction = await WalletTransaction.create({
      userId: req.user._id,
      transactionType: 'DEBIT',
      amount,
      description: `Withdrawal to ${destination || 'Bank Account'}`,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Withdrawal request submitted — pending admin approval',
      transaction,
      balance: currentBalance - amount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
