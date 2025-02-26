import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";

interface UiState {
  isNewMapDialogVisible: boolean;
  isEntityEditorVisible: boolean;
  entityEditorEntityId: string | null;
}

const initialState: UiState = {
  isNewMapDialogVisible: false,
  isEntityEditorVisible: false,
  entityEditorEntityId: null,
};

export const selectIsNewMapDialogVisible = (state: RootState) =>
  state.ui.isNewMapDialogVisible;

export const selectIsEntityEditorVisible = (state: RootState) =>
  state.ui.isEntityEditorVisible;

export const selectEntityEditorEntityId = (state: RootState) =>
  state.ui.entityEditorEntityId;

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
  },
});

export const {
  showNewMapDialog,
  hideNewMapDialog,
  showEntityEditor,
  hideEntityEditor,
} = uiSlice.actions;
export default uiSlice.reducer;
