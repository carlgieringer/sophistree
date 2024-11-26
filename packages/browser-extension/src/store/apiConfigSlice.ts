import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as appLogger from "../logging/appLogging";

export interface ApiConfigState {
  apiEndpointOverride: string | undefined;
}

const initialState: ApiConfigState = {
  apiEndpointOverride: undefined,
};

export const loadApiEndpointOverride = createAsyncThunk(
  "apiConfig/loadApiEndpointOverride",
  async () => {
    const result = await chrome.storage.local.get("apiEndpointOverride");
    return result.apiEndpointOverride as string | undefined;
  },
);

export const saveApiEndpointOverride = createAsyncThunk(
  "apiConfig/saveApiEndpointOverride",
  async (apiEndpointOverride: string | undefined) => {
    await chrome.storage.local.set({
      // events only fire for null, not undefined.
      apiEndpointOverride: apiEndpointOverride ?? null,
    });
    return apiEndpointOverride;
  },
);

export const apiConfigSlice = createSlice({
  name: "apiConfig",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadApiEndpointOverride.fulfilled, (state, action) => {
        // Convert nulls back to undefined.
        state.apiEndpointOverride = action.payload ?? undefined;
      })
      .addCase(saveApiEndpointOverride.fulfilled, (state, action) => {
        state.apiEndpointOverride = action.payload;
      })
      .addCase(saveApiEndpointOverride.rejected, (_, action) => {
        appLogger.error("Failed to save API endpoint", action.error);
      });
  },
});

export const selectApiEndpoint = (state: { apiConfig: ApiConfigState }) =>
  state.apiConfig.apiEndpointOverride;

export default apiConfigSlice.reducer;
