import { createAsyncThunk } from '@reduxjs/toolkit';

export const fetchTests = createAsyncThunk(
  'test/fetchTests',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/tests');
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
