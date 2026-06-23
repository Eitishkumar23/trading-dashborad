import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  tradingFeePercent: {
    type: Number,
    default: 0.15,
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  userTiers: {
    type: Array,
    default: [
      { tier: 'Bronze', withdrawalLimit: 50000, feeDiscount: 0 },
      { tier: 'Silver', withdrawalLimit: 250000, feeDiscount: 10 },
      { tier: 'Gold', withdrawalLimit: 1000000, feeDiscount: 25 },
      { tier: 'Platinum', withdrawalLimit: 5000000, feeDiscount: 50 }
    ]
  }
});

// Helper to get or create settings
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({});
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model('Settings', SettingsSchema);
