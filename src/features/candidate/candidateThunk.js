import { createAsyncThunk } from '@reduxjs/toolkit';

export const fetchCandidates = createAsyncThunk(
  'candidate/fetchCandidates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/candidates');
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
