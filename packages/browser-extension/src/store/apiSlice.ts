import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ArgumentMap } from "@sophistree/common";

import { selectApiEndpoint } from "./apiConfigSlice";
import * as appLogger from "../logging/appLogging";

export const syncMap = createAsyncThunk(
  "entities/syncMap",
  async (_, { getState }) => {
    const state = getState();
    const activeMapId = state.entities.activeMapId;
    if (!activeMapId) {
      throw new Error("No active map to sync");
    }

    const activeMap = state.entities.maps.find((map) => map.id === activeMapId);
    if (!activeMap) {
      throw new Error("Active map not found");
    }

    // Get the auth token
    const { token } = await chrome.identity.getAuthToken({
      interactive: false,
    });
    if (!token) {
      throw new Error("Not authenticated");
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "X-Auth-Provider": "google",
    };

    const apiEndpoint =
      selectApiEndpoint(state) || process.env.NEXT_PUBLIC_API_URL;

    // Check if map exists
    const checkResponse = await fetch(
      `${apiEndpoint}/api/argument-maps/${activeMapId}`,
      {
        headers: authHeaders,
      },
    );

    const mapExists = checkResponse.ok;
    const method = mapExists ? "PUT" : "POST";
    const url = mapExists
      ? `${apiEndpoint}/api/argument-maps/${activeMapId}`
      : `${apiEndpoint}/api/argument-maps`;

    const response = await fetch(url, {
      method,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: activeMap,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to ${mapExists ? "update" : "create"} map: ${response.statusText}`,
      );
    }

    return (await response.json()) as ArgumentMap;
  },
);

export const apiSlice = createSlice({
  name: "api",
  initialState: {},
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMap.pending, () => {
        // Could add loading state here if needed
      })
      .addCase(syncMap.fulfilled, () => {
        appLogger.log("Map synced successfully");
      })
      .addCase(syncMap.rejected, (state, action) => {
        appLogger.error("Failed to sync map:", action.error);
      });
  },
});

export default apiSlice.reducer;
