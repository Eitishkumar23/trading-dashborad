import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'ai_trading_secret_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google OAuth — verify ID token, find or create user, return JWT
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    let googleData;

    // Try as ID token first
    try {
      const googleRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
      );
      const { sub: googleId, email, name, picture } = googleRes.data;
      googleData = { googleId, email, name, picture };
    } catch {
      // If ID token fails, try as access_token
      const googleRes = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        { headers: { Authorization: `Bearer ${credential}` } }
      );
      const { sub: googleId, email, name, picture } = googleRes.data;
      googleData = { googleId, email, name, picture };
    }

    const { googleId, email, name, picture } = googleData;

    if (!email) {
      return res.status(400).json({ message: 'Could not retrieve email from Google' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        await user.save();
      }
    } else {
      user = await User.create({ name, email, googleId, avatar: picture });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || picture,
      token: generateToken(user._id),
    });
  } catch (error) {
    if (error.response?.status === 400) {
      return res.status(401).json({ message: 'Invalid Google token. Please try again.' });
    }
    res.status(500).json({ message: error.message });
  }
};
