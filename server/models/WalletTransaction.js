import mongoose from 'mongoose';

const WalletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  transactionType: {
    type: String,
    enum: ['CREDIT', 'DEBIT'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01,
  },
  description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('WalletTransaction', WalletTransactionSchema);
