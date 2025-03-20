import { store } from "./store";
import { loadUserDisplayName } from "./userDisplayNameSlice";
import * as appLogger from "../logging/appLogging";

const STORAGE_KEY = "userDisplayName";

export function setupUserDisplayNameSync() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && STORAGE_KEY in changes) {
      try {
        void store.dispatch(loadUserDisplayName());
      } catch (error) {
        appLogger.error("Failed to sync user display name from storage", error);
      }
    }
  });
}
