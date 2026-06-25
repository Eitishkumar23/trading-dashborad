import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { ADMIN_EMAIL, DEMO_EMAIL } from '../config/authConstants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai_trading_secret_key_2026';

const normalizeEmail = (email) => email?.toLowerCase().trim();

const getRole = (user) => {
  if (user?.role) return user.role;
  if (user?.email === ADMIN_EMAIL) return 'admin';
  if (user?.email === DEMO_EMAIL) return 'demo';
  return 'user';
};

const getAuthProvider = (user) => {
  if (user?.authProvider) return user.authProvider;
  if (user?.googleId && !user?.password) return 'google';
  return 'local';
};

const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: getRole(user),
      authProvider: getAuthProvider(user),
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

const buildAuthResponse = (user) => {
  const role = getRole(user);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role,
    authProvider: getAuthProvider(user),
    hasPassword: Boolean(user.password),
    isAdmin: role === 'admin',
    isDemo: role === 'demo',
    token: generateToken(user),
  };
};

const isBlocked = (user) => user.status === 'suspended' || user.status === 'banned';

const forbidSystemAccountMutation = (user) => getRole(user) === 'admin';

const adminSystemManagedMessage =
  'Administrator credentials are permanently managed by the system and cannot be modified from the application.';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (normalizedEmail === ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Admin account cannot be registered.' });
    }

    if (normalizedEmail === DEMO_EMAIL) {
      return res.status(403).json({ message: 'Demo account is system managed.' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      authProvider: 'local',
      role: 'user',
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
    const normalizedEmail = normalizeEmail(email);

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

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
        message: 'No application password is set for this account. Please use Google login if available.',
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

    if (forbidSystemAccountMutation(req.user)) {
      return res.status(403).json({ message: adminSystemManagedMessage });
    }

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
    if (forbidSystemAccountMutation(req.user)) {
      return res.status(403).json({ message: adminSystemManagedMessage });
    }

    const { newEmail, confirmEmail, password } = req.body;
    const normalizedEmail = normalizeEmail(newEmail);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!newEmail || !confirmEmail || !password) {
      return res.status(400).json({ message: 'Please provide new email, confirmation, and password' });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (normalizedEmail !== normalizeEmail(confirmEmail)) {
      return res.status(400).json({ message: 'Emails do not match' });
    }

    if (normalizedEmail === ADMIN_EMAIL) {
      return res.status(400).json({ message: 'That email is reserved for the administrator account' });
    }

    if (normalizedEmail === DEMO_EMAIL) {
      return res.status(400).json({ message: 'That email is reserved for the demo account' });
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
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Could not retrieve email from Google' });
    }

    if (normalizedEmail === ADMIN_EMAIL) {
      return res.status(403).json({
        message: 'Admin account cannot use Google Authentication. Please login using email and password.',
      });
    }

    if (normalizedEmail === DEMO_EMAIL) {
      return res.status(403).json({
        message: 'Demo account cannot use Google Authentication. Please login using email and password.',
      });
    }

    let user = await User.findOne({
      $or: [{ googleId }, { email: normalizedEmail }],
    }).select('+password');

    if (user) {
      if (getRole(user) === 'admin') {
        return res.status(403).json({
          message: 'Admin account cannot use Google Authentication. Please login using email and password.',
        });
      }

      if (getRole(user) === 'demo') {
        return res.status(403).json({
          message: 'Demo account cannot use Google Authentication. Please login using email and password.',
        });
      }

      if (isBlocked(user)) {
        return res.status(403).json({
          message: `Access denied: Your account is currently ${user.status}`,
        });
      }

      if (!user.googleId) {
        user.googleId = googleId;
      }

      if (!user.role) {
        user.role = 'user';
      }

      if (user.email === ADMIN_EMAIL) {
        user.role = 'admin';
        user.authProvider = 'local';
        user.googleId = null;
        user.avatar = user.avatar || picture;
        user.name = user.name || name;
        await user.save();
        return res.status(403).json({
          message: 'Admin account cannot use Google Authentication. Please login using email and password.',
        });
      }

      if (!user.authProvider || user.authProvider === 'local') {
        user.authProvider = user.password ? 'local' : 'google';
      }

      user.avatar = user.avatar || picture;
      await user.save();
    } else {
      user = await User.create({
        name,
        email: normalizedEmail,
        googleId,
        avatar: picture,
        authProvider: 'google',
        role: 'user',
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
