import { v4 as uuidv4 } from "uuid";
import * as appLogger from "./logging/appLogging";

const DEVICE_ID_PREFIX = "device-id-";

/**
 * Gets a stable device ID for a specific document.
 * If no device ID exists for this document, one will be created.
 */
export function getDeviceId(documentId: string): string {
  const storageKey = `${DEVICE_ID_PREFIX}${documentId}`;

  try {
    // Try to get existing device ID from local storage
    const existingId = window.localStorage.getItem(storageKey);

    if (existingId) {
      return existingId;
    }

    // Generate a new device ID if none exists
    const newDeviceId = uuidv4();
    window.localStorage.setItem(storageKey, newDeviceId);

    return newDeviceId;
  } catch (error) {
    appLogger.error("Failed to get or create device ID", error);
    // Return a fallback ID in case of error
    return `fallback-${Date.now()}`;
  }
}
