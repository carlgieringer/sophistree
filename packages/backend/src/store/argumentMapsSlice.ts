import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ArgumentMap } from "@prisma/client";

interface ArgumentMapsState {
  items: ArgumentMap[];
  isLoading: boolean;
  error: string | null;
  isCreating: boolean;
}

const initialState: ArgumentMapsState = {
  items: [],
  isLoading: true,
  error: null,
  isCreating: false,
};

export const fetchArgumentMaps = createAsyncThunk(
  "argumentMaps/fetchAll",
  async () => {
    const response = await fetch("/api/argument-maps");
    if (!response.ok) throw new Error("Failed to fetch maps");
    return response.json();
  }
);

const argumentMapsSlice = createSlice({
  name: "argumentMaps",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch maps
      .addCase(fetchArgumentMaps.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchArgumentMaps.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchArgumentMaps.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Failed to load maps";
      });
  },
});

export default argumentMapsSlice.reducer;
