import { useEffect } from "react";

import { useAppDispatch } from "./store";
import * as appLogger from "../logging/appLogging";
import { refreshAuth } from "./authSlice";

export function useRefreshAuth() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(refreshAuth()).catch((reason) =>
      appLogger.error("Failed to refresh auth", reason),
    );
  }, [dispatch]);
}
