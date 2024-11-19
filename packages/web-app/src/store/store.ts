import { configureStore } from "@reduxjs/toolkit";
import argumentMaps from "./argumentMapsSlice";

export const store = configureStore({
  reducer: {
    argumentMaps,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
