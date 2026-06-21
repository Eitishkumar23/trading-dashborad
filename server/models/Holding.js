import mongoose from 'mongoose';

const HoldingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  assetType: {
    type: String,
    enum: ['STOCK', 'CRYPTO'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  averageBuyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  investedAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can only have one holding entry per symbol
HoldingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export default mongoose.model('Holding', HoldingSchema);
