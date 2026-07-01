import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import themeReducer from './themeSlice.js';
import currencyReducer from './currencySlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    currency: currencyReducer,
  },
});
