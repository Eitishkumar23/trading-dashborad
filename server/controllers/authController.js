import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const ADMIN_EMAIL = 'eitishkoundal34@gmail.com';
const JWT_SECRET = process.env.JWT_SECRET || 'ai_trading_secret_key_2026';

const getAuthProvider = (user) => {
  const providerWasDefaulted = typeof user.$isDefault === 'function' && user.$isDefault('authProvider');

  if (user.authProvider && !providerWasDefaulted) {
    return user.authProvider;
  }

  if (user.googleId && !user.password) {
    return 'google';
  }

  return user.authProvider || 'local';
};

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      authProvider: getAuthProvider(user),
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const buildAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  authProvider: getAuthProvider(user),
  hasPassword: Boolean(user.password),
  token: generateToken(user),
  isAdmin: user.email === ADMIN_EMAIL,
});

const isBlocked = (user) => user.status === 'suspended' || user.status === 'banned';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      authProvider: 'local',
    });

    res.status(201).json(buildAuthResponse(user));
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

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (isBlocked(user)) {
      return res.status(403).json({
        message: `Access denied: Your account is currently ${user.status}`,
      });
    }

    if (!user.password) {
      return res.status(401).json({
        message: 'No application password is set for this account. Sign in with Google and set a password from Profile.',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json(buildAuthResponse(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = buildAuthResponse(user);
    delete profile.token;
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set or update application password
// @route   PUT /api/auth/password
// @access  Private
export const setApplicationPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide and confirm the new password' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hadPassword = Boolean(user.password);

    if (hadPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change your password' });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: hadPassword ? 'Password updated successfully' : 'Password set successfully',
      user: buildAuthResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update account email
// @route   PUT /api/auth/email
// @access  Private
export const updateEmail = async (req, res) => {
  try {
    const { newEmail, confirmEmail, password } = req.body;
    const normalizedEmail = newEmail?.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newEmail || !confirmEmail || !password) {
      return res.status(400).json({ message: 'Please provide new email, confirmation, and password' });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (normalizedEmail !== confirmEmail.toLowerCase().trim()) {
      return res.status(400).json({ message: 'Emails do not match' });
    }

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Set an application password before updating your email' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    user.email = normalizedEmail;
    await user.save();

    res.json({
      message: 'Email updated successfully',
      user: buildAuthResponse(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    res.status(500).json({ message: error.message });
  }
};

// @desc    Google OAuth: verify Google token, find or create user, return JWT
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    let googleData;

    try {
      const googleRes = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
      );
      const { sub: googleId, email, name, picture } = googleRes.data;
      googleData = { googleId, email, name, picture };
    } catch {
      const googleRes = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${credential}` } }
      );
      const { sub: googleId, email, name, picture } = googleRes.data;
      googleData = { googleId, email, name, picture };
    }

    const { googleId, email, name, picture } = googleData;

    if (!email) {
      return res.status(400).json({ message: 'Could not retrieve email from Google' });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase().trim() }],
    }).select('+password');

    if (user) {
      if (isBlocked(user)) {
        return res.status(403).json({
          message: `Access denied: Your account is currently ${user.status}`,
        });
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }

      const providerWasDefaulted = typeof user.$isDefault === 'function' && user.$isDefault('authProvider');
      if (!user.authProvider || providerWasDefaulted) {
        user.authProvider = user.password ? 'local' : 'google';
      }

      user.avatar = user.avatar || picture;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        authProvider: 'google',
      });
    }

    res.json(buildAuthResponse(user));
  } catch (error) {
    if (error.response?.status === 400) {
      return res.status(401).json({ message: 'Invalid Google token. Please try again.' });
    }
    res.status(500).json({ message: error.message });
  }
};
