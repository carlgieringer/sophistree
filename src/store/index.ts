// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import nodesReducer from './nodesSlice';

export const store = configureStore({
  reducer: {
    nodes: nodesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
