import { createAsyncThunk } from '@reduxjs/toolkit';
import { AUTH_API_BASE_URL } from '../../utils/constants';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      // API call logic here
      const response = await fetch(`${AUTH_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
