import { buildCreateSlice, asyncThunkCreator } from "@reduxjs/toolkit";

// https://redux-toolkit.js.org/api/createSlice#createasyncthunk
export const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});
