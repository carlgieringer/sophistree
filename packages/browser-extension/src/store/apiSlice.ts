import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ArgumentMap } from "@sophistree/common";

import { selectApiEndpoint } from "./apiConfigSlice";
import * as appLogger from "../logging/appLogging";
import { getDoc } from "../sync";

export const publishMap = createAsyncThunk(
  "entities/publishMap",
  async (_, { getState }) => {
    const state = getState();
    const documentId = state.entities.activeMapAutomergeDocumentId;
    if (!documentId) {
      throw new Error("No active map to publish");
    }

    const activeMap = getDoc(documentId);
    if (!activeMap) {
      appLogger.error(`Doc ID ${documentId} did not have a doc.`);
      return;
    }
    const mapId = activeMap.id;

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
      `${apiEndpoint}/api/argument-maps/${mapId}`,
      {
        headers: authHeaders,
      },
    );

    const mapExists = checkResponse.ok;
    const method = mapExists ? "PUT" : "POST";
    const url = mapExists
      ? `${apiEndpoint}/api/argument-maps/${mapId}`
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
      .addCase(publishMap.pending, () => {
        // Could add loading state here if needed
      })
      .addCase(publishMap.fulfilled, () => {
        appLogger.log("Map published successfully");
      })
      .addCase(publishMap.rejected, (state, action) => {
        appLogger.error("Failed to publish map:", action.error);
      });
  },
});

export default apiSlice.reducer;
