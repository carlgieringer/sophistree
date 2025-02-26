import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface UiState {
  isNewMapDialogVisible: boolean;
  isEntityEditorVisible: boolean;
  entityEditorEntityId: string | null;
  isBottomSheetVisible: boolean;
}

const initialState: UiState = {
  isNewMapDialogVisible: false,
  isEntityEditorVisible: false,
  entityEditorEntityId: null,
  isBottomSheetVisible: true,
};

export const selectIsNewMapDialogVisible = (state: RootState) =>
  state.ui.isNewMapDialogVisible;

export const selectIsEntityEditorVisible = (state: RootState) =>
  state.ui.isEntityEditorVisible;

export const selectEntityEditorEntityId = (state: RootState) =>
  state.ui.entityEditorEntityId;

export const selectIsBottomSheetVisible = (state: RootState) =>
  state.ui.isBottomSheetVisible;

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
    showEntityEditor: (state, action: PayloadAction<string>) => {
      state.isEntityEditorVisible = true;
      state.entityEditorEntityId = action.payload;
    },
    hideEntityEditor: (state) => {
      state.isEntityEditorVisible = false;
      state.entityEditorEntityId = null;
    },
    showBottomSheet: (state) => {
      state.isBottomSheetVisible = true;
    },
    hideBottomSheet: (state) => {
      state.isBottomSheetVisible = false;
    },
  },
});

export const {
  showNewMapDialog,
  hideNewMapDialog,
  showEntityEditor,
  hideEntityEditor,
  showBottomSheet,
  hideBottomSheet,
} = uiSlice.actions;
export default uiSlice.reducer;
