import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface UiState {
  isNewMapDialogVisible: boolean;
}

const initialState: UiState = {
  isNewMapDialogVisible: false,
};

export const selectIsNewMapDialogVisible = (state: RootState) =>
  state.ui.isNewMapDialogVisible;

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showNewMapDialog: (state) => {
      state.isNewMapDialogVisible = true;
    },
    hideNewMapDialog: (state) => {
      state.isNewMapDialogVisible = false;
    },
  },
});

export const { showNewMapDialog, hideNewMapDialog } = uiSlice.actions;
export default uiSlice.reducer;
