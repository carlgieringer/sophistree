import { useEffect } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

import * as appLogger from "../logging/appLogging";
import { refreshAuth } from "./authSlice";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useRefreshAuth() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(refreshAuth()).catch((reason) =>
      appLogger.error("Failed to refresh auth", reason),
    );
  }, [dispatch]);
}
