import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import AssetLimit from '../models/AssetLimit.js';

const router = express.Router();
const ADMIN_EMAIL = 'eitishkoundal34@gmail.com';

// Admin middleware that checks if email matches ADMIN_EMAIL
const adminOnly = (req, res, next) => {
  if (req.user && req.user.email === ADMIN_EMAIL) {
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

export default router;
