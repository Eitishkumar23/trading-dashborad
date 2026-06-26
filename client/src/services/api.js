import axios from 'axios';
import { store } from '../redux/store.js';
import { logout } from '../redux/authSlice.js';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : 'https://trading-dashborad.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT Token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to catch auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Dispatch logout if unauthorized (session expired / invalid token)
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  googleAuth: (credential) => API.post('/auth/google', { credential }),
  getProfile: () => API.get('/auth/profile'),
  setPassword: (data) => API.put('/auth/password', data),
  updateEmail: (data) => API.put('/auth/email', data),
  seedData: () => API.post('/seed'),// Seed bypass
};

export const maintenanceAPI = {
  getStatus: () => API.get('/settings/status'),
};

export const walletAPI = {
  addFunds: (amount, description) => API.post('/wallet/add', { amount, description }),
  withdrawFunds: (amount, destination) => API.post('/wallet/withdraw', { amount, destination }),
  getDetails: () => API.get('/wallet/details'),
};

export const tradeAPI = {
  buyAsset: (data) => API.post('/trade/buy', data), // { symbol, assetType, quantity, price }
  sellAsset: (data) => API.post('/trade/sell', data), // { symbol, quantity, price }
  getHistory: (filter) => API.get(`/trade/history?filter=${filter || 'all'}`),
};

export const marketAPI = {
  getMarkets: () => API.get('/market'),
  searchMarkets: (query) => API.get(`/market/search?q=${query}`),
  getOverview: () => API.get('/market/overview'),

  // Watchlist
  getWatchlist: () => API.get('/market/watchlist'),
  addToWatchlist: (symbol, assetType) => API.post('/market/watchlist', { symbol, assetType }),
  removeFromWatchlist: (symbol) => API.delete(`/market/watchlist/${symbol}`),

  // Alerts
  getAlerts: () => API.get('/market/alerts'),
  createAlert: (data) => API.post('/market/alerts', data), // { symbol, condition, value }
  deleteAlert: (id) => API.delete(`/market/alerts/${id}`),
};

export const portfolioAPI = {
  getHoldings: () => API.get('/portfolio/holdings'),
  getDashboard: () => API.get('/portfolio/dashboard'),
};

export const adminAPI = {
  getAssets: () => API.get('/admin/assets'),
  addAsset: (data) => API.post('/admin/assets', data),
  updateAsset: (symbol, data) => API.put(`/admin/assets/${symbol}`, data),
  deleteAsset: (symbol) => API.delete(`/admin/assets/${symbol}`),
  
  // New Admin Dashboard & Management APIs
  getStats: () => API.get('/admin/stats'),
  getUsers: () => API.get('/admin/users'),
  updateUserStatus: (id, status) => API.put(`/admin/users/${id}/status`, { status }),
  getUserProfile: (id) => API.get(`/admin/users/${id}/profile`),
  resetUser2FA: (id) => API.post(`/admin/users/${id}/reset-2fa`),
  getOrders: () => API.get('/admin/orders'),
  getWithdrawals: () => API.get('/admin/withdrawals'),
  updateWithdrawalStatus: (id, status, reason) => API.put(`/admin/withdrawals/${id}/status`, { status, reason }),
  getSettings: () => API.get('/admin/settings'),
  updateSettings: (data) => API.put('/admin/settings', data),
};

export default API;
