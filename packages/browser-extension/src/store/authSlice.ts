import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as appLogger from "../logging/appLogging";
import { useSelector } from "react-redux";

interface User {
  email: string;
  name: string;
  picture: string;
}

interface AuthState {
  isLoading: boolean;
  user: User | undefined;
  isAuthenticated: boolean;
  error: string | undefined;
}

const initialState: AuthState = {
  isLoading: false,
  user: undefined,
  isAuthenticated: false,
  error: undefined,
};

async function authenticate(details: chrome.identity.TokenDetails) {
  const { token } = await chrome.identity.getAuthToken(details);
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get user info. ${response.status} "${response.statusText}": ${await response.text()}`,
    );
  }

  const user = (await response.json()) as User;
  return user;
}

async function broadcastAuthChange() {
  try {
    await chrome.runtime.sendMessage({ action: "authStateChanged" });
  } catch (error) {
    appLogger.warn("Failed to broadcast auth state change", error);
  }
}

// TODO move createAsyncThunks into slice (https://redux-toolkit.js.org/api/createSlice#the-reducers-creator-callback-notation)

export const refreshAuth = createAsyncThunk(
  "auth/refreshAuth",
  async (_, { rejectWithValue }) => {
    try {
      return await authenticate({ interactive: false });
    } catch {
      return rejectWithValue("");
    }
  },
);

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (_, { rejectWithValue }) => {
    try {
      const user = await authenticate({ interactive: true });
      await broadcastAuthChange();
      return user;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue(`Failed to sign in ${JSON.stringify(error)}`);
    }
  },
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { rejectWithValue }) => {
    try {
      await chrome.identity.clearAllCachedAuthTokens();
      await broadcastAuthChange();
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue(`Failed to sign out ${JSON.stringify(error)}`);
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
  selectors: {
    isAuthenticated: (state) => state.isAuthenticated,
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = undefined;
      })
      .addCase(refreshAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.user = undefined;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = undefined;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.user = undefined;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = undefined;
        state.isAuthenticated = false;
        state.error = undefined;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export function useIsAuthenticated() {
  return useSelector(authSlice.selectors.isAuthenticated);
}

export default authSlice.reducer;
