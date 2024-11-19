import {
  AsyncThunkPayloadCreator,
  AsyncThunk,
  AsyncThunkOptions,
} from "@reduxjs/toolkit";

import { AppDispatch, RootState } from "./store";

/** Module augmentation that types createAsyncThunk's getState to our RootState. */
declare module "@reduxjs/toolkit" {
  type AsyncThunkConfig<T = unknown> = {
    state: RootState;
    dispatch: AppDispatch;
    extra?: unknown;
    rejectValue: T;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
  };

  function createAsyncThunk<Returned, ThunkArg = void>(
    typePrefix: string,
    payloadCreator: AsyncThunkPayloadCreator<
      Returned,
      ThunkArg,
      AsyncThunkConfig<string>
    >,
    options?: AsyncThunkOptions<ThunkArg, AsyncThunkConfig<string>>,
  ): AsyncThunk<Returned, ThunkArg, AsyncThunkConfig<string>>;
}
