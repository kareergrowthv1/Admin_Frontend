import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tests: [],
  isLoading: false,
  error: null,
};

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    setTests: (state, action) => {
      state.tests = action.payload;
    },
  },
});

export const { setTests } = testSlice.actions;
export default testSlice.reducer;
