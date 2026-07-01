import mongoose from 'mongoose';

const AssetLimitSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  assetType: {
    type: String,
    required: true,
    enum: ['crypto', 'stock', 'real_asset'],
    lowercase: true,
    trim: true,
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  remainingQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.model('AssetLimit', AssetLimitSchema);
