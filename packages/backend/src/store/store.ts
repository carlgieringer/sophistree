import { configureStore } from '@reduxjs/toolkit';
import argumentMapsReducer from './argumentMapsSlice';

export const store = configureStore({
  reducer: {
    argumentMaps: argumentMapsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
