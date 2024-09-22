import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createMigrate } from "redux-persist";
import storage from "redux-persist/lib/storage";

import entitiesReducer from "./entitiesSlice";

const persistConfig = {
  key: "root",
  storage,
};

const persistedReducer = persistReducer(persistConfig, entitiesReducer);

export const store = configureStore({
  reducer: {
    entities: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
