import { createSlice } from '@reduxjs/toolkit';
import { HYDRATE } from 'next-redux-wrapper';
import type { Action } from 'redux';
import { AppState } from './store';

export interface Generations {
  generations: string[];
}

const initialState: Generations = {
  generations: ['I'],
};

export const generationsSlice = createSlice({
  name: 'generations',
  initialState,
  reducers: {
    setGenerations(state, action) {
      state.generations = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase<
      typeof HYDRATE,
      Action<typeof HYDRATE> & { payload: { generations: Generations } }
    >(HYDRATE, (state, action) => ({
      ...state,
      ...action.payload.generations,
    }));
  },
});

export const { setGenerations } = generationsSlice.actions;

export const selectGenerations = (state: AppState) =>
  state.generations.generations;

export default generationsSlice.reducer;
