import { useEffect, useState } from "react";
import * as appLogger from "../logging/appLogging";

export function isValidWebsocketUrl(url: string): {
  isValid: boolean;
  message?: string;
} {
  if (!url) return { isValid: true };

  try {
    const wsUrl = new URL(url);
    if (!["ws:", "wss:"].includes(wsUrl.protocol)) {
      return {
        isValid: false,
        message: "URL must start with ws:// or wss://",
      };
    }

    if (wsUrl.protocol === "ws:" && wsUrl.hostname !== "localhost") {
      return {
        isValid: false,
        message: "ws:// is only allowed with localhost",
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      message: "Invalid URL format",
    };
  }
}

export type SyncServerAddressChangeCallback = (addresses: string[]) => void;
export type ChromeStorageChangeCallback = (
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string,
) => void;

// Private map to store callback -> listener mappings
const listeners = new Map<
  SyncServerAddressChangeCallback,
  ChromeStorageChangeCallback
>();

function addListener(callback: SyncServerAddressChangeCallback) {
  const storageListener: ChromeStorageChangeCallback = (changes, areaName) => {
    if (
      areaName === "local" &&
      "syncServerAddresses" in changes &&
      changes.syncServerAddresses
    ) {
      const newAddresses =
        (changes.syncServerAddresses.newValue as string[] | undefined) ?? [];
      callback(newAddresses);
    }
  };

  listeners.set(callback, storageListener);
  chrome.storage.onChanged.addListener(storageListener);
}

export function removeListener(callback: (addresses: string[]) => void) {
  const listener = listeners.get(callback);
  if (listener) {
    chrome.storage.onChanged.removeListener(listener);
    listeners.delete(callback);
  }
}

async function getDefaultSyncServerAddresses(): Promise<string[]> {
  const result = await chrome.storage.local.get("syncServerAddresses");
  return (
    (result.syncServerAddresses as string[] | undefined) ?? [
      "wss://sophistree.app",
    ]
  );
}

export async function setDefaultSyncServerAddresses(
  addresses: string[],
): Promise<void> {
  // Validate addresses
  const invalidAddresses = addresses.filter(
    (addr) => !isValidWebsocketUrl(addr).isValid,
  );
  if (invalidAddresses.length > 0) {
    throw new Error(
      `Invalid sync server addresses: ${invalidAddresses.join(", ")}`,
    );
  }

  await chrome.storage.local.set({
    syncServerAddresses: addresses.length > 0 ? addresses : null,
  });
}

export function useDefaultSyncServerAddresses(): {
  addresses: string[];
  loading: boolean;
  error: Error | null;
  save: (addresses: string[]) => Promise<void>;
} {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const result = await getDefaultSyncServerAddresses();
        setAddresses(result);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
        appLogger.error("Failed to load sync server addresses", e);
      } finally {
        setLoading(false);
      }
    };

    void loadAddresses();

    addListener(setAddresses);
    return () => {
      removeListener(setAddresses);
    };
  }, []);

  const save = async (newAddresses: string[]) => {
    try {
      await setDefaultSyncServerAddresses(newAddresses);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      appLogger.error("Failed to save sync server addresses", e);
      throw e;
    }
  };

  return { addresses, loading, error, save };
}
