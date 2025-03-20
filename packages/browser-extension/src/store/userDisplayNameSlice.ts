import { v4 as uuidv4 } from "uuid";
import {
  uniqueNamesGenerator,
  Config,
  adjectives,
  animals,
} from "unique-names-generator";
import * as appLogger from "../logging/appLogging";
import { createAppSlice } from "./createAppSlice";

const nameConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: " ",
  length: 2,
  style: "capital",
};

const STORAGE_KEY = "userDisplayName";
const MAX_LENGTH = 64;

interface UserDisplayNameState {
  displayName: string | undefined;
  isLoading: boolean;
  error: string | undefined;
}

const initialState: UserDisplayNameState = {
  displayName: undefined,
  isLoading: false,
  error: undefined,
};

function generateDisplayName(): string {
  // Generate a unique ID to use as seed
  const seed = uuidv4();
  return uniqueNamesGenerator({ ...nameConfig, seed });
}

export const userDisplayNameSlice = createAppSlice({
  name: "userDisplayName",
  initialState,
  selectors: {
    displayName: (state) => state.displayName,
    isLoading: (state) => state.isLoading,
    error: (state) => state.error,
  },
  reducers: (create) => ({
    loadUserDisplayName: create.asyncThunk(
      async () => {
        try {
          const result = (await chrome.storage.local.get(STORAGE_KEY)) as {
            [key: string]: string | undefined;
          };
          let displayName = result[STORAGE_KEY];

          if (!displayName) {
            displayName = generateDisplayName();
            await chrome.storage.local.set({ [STORAGE_KEY]: displayName });
          }

          return displayName;
        } catch (error) {
          appLogger.error("Failed to load user display name", error);
          throw error;
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = undefined;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.displayName = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error = action.error?.message || "Failed to load display name";
        },
      },
    ),
    updateUserDisplayName: create.asyncThunk(
      async (displayName: string, { rejectWithValue }) => {
        try {
          if (displayName.length > MAX_LENGTH) {
            return rejectWithValue(
              `Display name must be less than ${MAX_LENGTH} characters`,
            );
          }

          await chrome.storage.local.set({ [STORAGE_KEY]: displayName });
          return displayName;
        } catch (error) {
          appLogger.error("Failed to update user display name", error);
          throw error;
        }
      },
      {
        pending: (state) => {
          state.isLoading = true;
          state.error = undefined;
        },
        fulfilled: (state, action) => {
          state.isLoading = false;
          state.displayName = action.payload;
        },
        rejected: (state, action) => {
          state.isLoading = false;
          state.error =
            (action.payload as string) || "Failed to update display name";
        },
      },
    ),
  }),
});

export const { loadUserDisplayName, updateUserDisplayName } =
  userDisplayNameSlice.actions;

export function useUserDisplayName() {
  return userDisplayNameSlice.selectors.displayName;
}

export function useUserDisplayNameLoading() {
  return userDisplayNameSlice.selectors.isLoading;
}

export function useUserDisplayNameError() {
  return userDisplayNameSlice.selectors.error;
}

export default userDisplayNameSlice.reducer;
