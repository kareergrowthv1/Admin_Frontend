import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
    // Called on app startup to restore user from localStorage into Redux
    rehydrateUser: (state) => {
      try {
        const stored = localStorage.getItem('admin_user');
        if (stored) {
          state.user = JSON.parse(stored);
        }
      } catch {
        state.user = null;
      }
    },
  },
});

export const { setUser, clearUser, rehydrateUser } = authSlice.actions;
export default authSlice.reducer;
