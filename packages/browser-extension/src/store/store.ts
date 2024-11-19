import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createMigrate } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { useDispatch } from "react-redux";

import entities from "./entitiesSlice";
import { persistedStateVersion, reduxPersistMigrations } from "./migrations";
import ui from "./uiSlice";
import auth from "./authSlice";
import apiConfig from "./apiConfigSlice";

const persistConfig = {
  key: "root",
  storage,
  version: persistedStateVersion,
  migrate: createMigrate(reduxPersistMigrations, {
    debug: process.env.NODE_ENV !== "production",
  }),
  whitelist: ["entities", "apiConfig"],
};

const rootReducer = combineReducers({
  auth,
  entities,
  ui,
  apiConfig,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
