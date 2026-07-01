import { createSlice } from '@reduxjs/toolkit';

const LS_KEY = 'preferredCurrency';

const getInitialCurrency = () => {
  const saved = localStorage.getItem(LS_KEY);
  const valid = ['INR', 'USD', 'USDT', 'EUR', 'GBP'];
  return valid.includes(saved) ? saved : 'INR';
};

const currencySlice = createSlice({
  name: 'currency',
  initialState: {
    preferred: getInitialCurrency(),
  },
  reducers: {
    setPreferredCurrency: (state, action) => {
      const valid = ['INR', 'USD', 'USDT', 'EUR', 'GBP'];
      if (valid.includes(action.payload)) {
        state.preferred = action.payload;
        localStorage.setItem(LS_KEY, action.payload);
      }
    },
  },
});

export const { setPreferredCurrency } = currencySlice.actions;
export default currencySlice.reducer;
