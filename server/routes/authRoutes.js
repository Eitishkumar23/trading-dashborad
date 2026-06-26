import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  googleAuth,
  setApplicationPassword,
  updateEmail,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireWritablePlatform } from '../middleware/maintenanceMiddleware.js';

const router = express.Router();

router.post('/register', requireWritablePlatform, registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/profile', protect, getUserProfile);
router.put('/password', protect, requireWritablePlatform, setApplicationPassword);
router.put('/email', protect, requireWritablePlatform, updateEmail);

export default router;
