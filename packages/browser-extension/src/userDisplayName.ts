import { getDeviceId } from "./deviceId";
import { useEffect } from "react";
import {
  Config,
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { v4 as uuidv4 } from "uuid";

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
  const currentDisplayName = useUserDisplayName();
  useEffect(() => {
    if (!map) return;

    const userDisplayName = getUserDisplayName();
    if (!currentDisplayName && userDisplayName) {
      dispatch(
        updateUserInfoInMaps({
          userDisplayName,
        }),
      );
    }

    // Only update if there's no existing display name
  }, [dispatch, map, currentDisplayName]);
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
export function getUserDisplayName(): string | undefined {
  return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
}

// Ensure a user display name exists, generating one if needed
function ensureUserDisplayName(): string {
  let displayName = getUserDisplayName();

  if (!displayName) {
    displayName = generateDisplayName();
    window.localStorage.setItem(STORAGE_KEY, displayName);
  }

  return displayName;
}

// Update the user display name in storage
export function updateUserDisplayName(displayName: string): void {
  if (displayName.length > USER_DISPLAY_LENGTH_MAX_LENGTH) {
    throw new Error(
      `Display name must be less than ${USER_DISPLAY_LENGTH_MAX_LENGTH} characters`,
    );
  }

  window.localStorage.setItem(STORAGE_KEY, displayName);
}
