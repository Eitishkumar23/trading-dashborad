import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
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
  condition: {
    type: String,
    enum: ['ABOVE', 'BELOW'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  isTriggered: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Alert', AlertSchema);
