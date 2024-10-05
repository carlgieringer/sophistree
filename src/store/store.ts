import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createMigrate } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { useDispatch } from "react-redux";

import entitiesReducer from "./entitiesSlice";
import { persistedStateVersion, reduxPersistMigrations } from "./migrations";
import uiReducer from "./uiSlice";

const persistConfig = {
  key: "root",
  storage,
  version: persistedStateVersion,
  migrate: createMigrate(reduxPersistMigrations, {
    debug: process.env.NODE_ENV !== "production",
  }),
};

const persistedReducer = persistReducer(persistConfig, entitiesReducer);

export const store = configureStore({
  reducer: {
    entities: persistedReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
