import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

const initialState = {
  user,
  token,
  isAuthenticated: !!token,
  loading: false,
  error: null,
  isAdmin: user?.isAdmin || false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAdmin = action.payload.user?.isAdmin || false;
      state.error = null;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    authFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isAdmin = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateUserWalletLocal: (state, action) => {
      // Helper to locally update cached wallet values if needed
      if (state.user) {
        state.user.walletBalance = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateUserProfileLocal: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        state.isAdmin = state.user?.isAdmin || false;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
  },
});

export const {
  authStart,
  authSuccess,
  authFailure,
  logout,
  updateUserWalletLocal,
  updateUserProfileLocal,
} = authSlice.actions;
export default authSlice.reducer;
