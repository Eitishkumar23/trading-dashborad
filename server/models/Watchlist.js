import mongoose from 'mongoose';

const WatchlistSchema = new mongoose.Schema({
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a user can only watchlist a symbol once
WatchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

export default mongoose.model('Watchlist', WatchlistSchema);
