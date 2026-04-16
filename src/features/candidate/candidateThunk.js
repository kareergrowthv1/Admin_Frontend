import { createAsyncThunk } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../utils/constants';

export const fetchCandidates = createAsyncThunk(
  'candidate/fetchCandidates',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/candidates`);
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
