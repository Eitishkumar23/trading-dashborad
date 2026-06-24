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

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/profile', protect, getUserProfile);
router.put('/password', protect, setApplicationPassword);
router.put('/email', protect, updateEmail);

export default router;
