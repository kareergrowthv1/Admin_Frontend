import { createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../utils/constants';

export const fetchTests = createAsyncThunk(
  'test/fetchTests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tests`);
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
