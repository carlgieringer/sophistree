import { getDeviceId } from "./deviceId";
import { useEffect } from "react";
import {
  Config,
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { v4 as uuidv4 } from "uuid";

import * as appLogger from "./logging/appLogging";
import { useAppDispatch } from "./store";
import {
  updateUserInfoInMaps,
  useActiveMapAutomergeDocumentId,
} from "./store/entitiesSlice";
import { useActiveMap } from "./sync/hooks";

export function useUserDisplayNameSyncAndInitialization() {
  // Must setup sync before ensuring the name so that a new name is updated in the active map.
  useUserDisplayNameSync();
  useMaybeInitializeUserDisplayName();
  useSetActiveMapUserDisplayName();
}

// Hook to sync user display name with active map when it changes in storage
function useUserDisplayNameSync() {
  const dispatch = useAppDispatch();
  const documentId = useActiveMapAutomergeDocumentId();
  const currentDisplayName = useUserDisplayName();
  useEffect(() => {
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && "userDisplayName" in changes) {
        const newDisplayName = changes["userDisplayName"].newValue as
          | string
          | undefined;
        if (!newDisplayName) return;

        dispatch(
          updateUserInfoInMaps({
            userDisplayName: newDisplayName,
          }),
        );
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [dispatch, documentId, currentDisplayName]);
}

function useSetActiveMapUserDisplayName() {
  const dispatch = useAppDispatch();
  const map = useActiveMap();
  const displayName = useUserDisplayName();
  useEffect(() => {
    if (!map) return;

    async function setActiveMapUserDisplayName() {
      const userDisplayName = await getUserDisplayName();
      if (!displayName && userDisplayName) {
        dispatch(
          updateUserInfoInMaps({
            userDisplayName,
          }),
        );
      }
    }

    void setActiveMapUserDisplayName();

    // Only update if there's no existing display name
  }, [dispatch, map, displayName]);
}

function useUserDisplayName() {
  const map = useActiveMap();
  if (!map) {
    return undefined;
  }
  const deviceId = getDeviceId(map.automergeDocumentId);
  return map?.userInfoByDeviceId?.[deviceId]?.userDisplayName;
}

// Hook to ensure a user display name exists
function useMaybeInitializeUserDisplayName() {
  useEffect(() => {
    void ensureUserDisplayName();
  }, []);
}

const STORAGE_KEY = "userDisplayName";
export const USER_DISPLAY_LENGTH_MAX_LENGTH = 64;

const nameConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: " ",
  length: 2,
  style: "capital",
};

// Generate a random display name
function generateDisplayName(): string {
  // Generate a unique ID to use as seed
  const seed = uuidv4();
  return uniqueNamesGenerator({ ...nameConfig, seed });
}

// Get the current display name from storage
export async function getUserDisplayName(): Promise<string | undefined> {
  try {
    const result = (await chrome.storage.local.get(STORAGE_KEY)) as {
      [key: string]: string | undefined;
    };
    return result[STORAGE_KEY];
  } catch (error) {
    appLogger.error("Failed to get user display name from storage", error);
    return undefined;
  }
}

// Ensure a user display name exists, generating one if needed
async function ensureUserDisplayName(): Promise<string> {
  try {
    let displayName = await getUserDisplayName();

    if (!displayName) {
      displayName = generateDisplayName();
      await chrome.storage.local.set({ [STORAGE_KEY]: displayName });
    }

    return displayName;
  } catch (error) {
    appLogger.error("Failed to ensure user display name", error);
    // Return a fallback name in case of error
    return "Unknown User";
  }
}

// Update the user display name in storage
export async function updateUserDisplayName(
  displayName: string,
): Promise<void> {
  if (displayName.length > USER_DISPLAY_LENGTH_MAX_LENGTH) {
    throw new Error(
      `Display name must be less than ${USER_DISPLAY_LENGTH_MAX_LENGTH} characters`,
    );
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: displayName });
}
