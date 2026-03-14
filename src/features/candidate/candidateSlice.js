import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  candidates: [],
  isLoading: false,
  error: null,
};

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    setCandidates: (state, action) => {
      state.candidates = action.payload;
    },
  },
});

export const { setCandidates } = candidateSlice.actions;
export default candidateSlice.reducer;
