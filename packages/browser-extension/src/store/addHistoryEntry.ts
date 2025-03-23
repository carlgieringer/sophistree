import { Heads } from "@automerge/automerge/next";
import { getDeviceId } from "../deviceId";

import { ArgumentMap, ArgumentMapHistoryChange } from "@sophistree/common";

/** Add a history entry to the map for the change. */
export function addHistoryEntry(
  heads: Heads | undefined,
  map: ArgumentMap,
  change: ArgumentMapHistoryChange,
): void;
/**
 * Add a history entry to the map for a change based on a callback. If the map's last history
 * entry had a single change that is compatible with the current change, the last change is
 * provided to the callback to combine the changes. In that case, the return value will replace
 * the last change.
 *
 * Changes are compatible if:
 *
 *  - Same change type
 *  - Same actor ID
 *  - Same action object
 *
 * changeFn should not have side effects because addHistoryEntry may call it twice: once with a
 * previous change, to see if they are compatible, and once without.
 */
export function addHistoryEntry<
  CT extends ArgumentMapHistoryChange["type"],
  C extends Extract<ArgumentMapHistoryChange, { type: CT }>,
>(
  heads: Heads | undefined,
  map: ArgumentMap,
  changeType: CT,
  changeFn: (lastChange: C | undefined) => C,
): void;
/**
 * Add a new history entry with a single change. We clone the change in case it references existing
 * Automerge objects. */
export function addHistoryEntry<C extends ArgumentMapHistoryChange>(
  heads: Heads | undefined,
  map: ArgumentMap,
  changeOrType: ArgumentMapHistoryChange | C["type"],
  changeFn?: (lastChange: C | undefined) => C,
): void {
  const deviceId = getDeviceId(map.automergeDocumentId);
  const timestamp = new Date().toISOString();
  const userDisplayName = map.userInfoByDeviceId[deviceId]?.userDisplayName;

  // Direct change case
  if (typeof changeOrType !== "string") {
    map.history.push({
      deviceId,
      userDisplayName,
      heads,
      timestamp,
      changes: [cloneChange(changeOrType)],
    });
    return;
  }

  // String type case - must have changeFn
  if (!changeFn) {
    throw new Error("changeFn is required when using a string type");
  }

  // Check if we can update the last entry
  if (map.history.length > 0) {
    const lastEntry = map.history[map.history.length - 1];
    if (lastEntry.changes.length === 1) {
      const lastChange = lastEntry.changes[0];
      if (lastChange.type === changeOrType && lastEntry.deviceId === deviceId) {
        // Type assertion is safe here because we've verified the types match
        const newChange = changeFn(lastChange as C);
        if (canCombineHistoryChanges(lastChange, newChange)) {
          map.history.splice(map.history.length - 1, 1, {
            deviceId: getDeviceId(map.automergeDocumentId),
            userDisplayName,
            heads,
            timestamp,
            changes: [cloneChange(newChange)],
          });
          return;
        }
      }
    }
  }

  // Create new entry
  const change = changeFn(undefined);
  map.history.push({
    deviceId,
    userDisplayName,
    heads,
    timestamp,
    changes: [cloneChange(change)],
  });
}

function canCombineHistoryChanges(
  change1: ArgumentMapHistoryChange,
  change2: ArgumentMapHistoryChange,
) {
  switch (change1.type) {
    case "RenameMap":
      return change2.type === "RenameMap";
    case "ModifyProposition":
      return change2.type === "ModifyProposition" && change1.id === change2.id;
    case "ModifyMediaExcerpt":
      return change2.type === "ModifyMediaExcerpt" && change1.id === change2.id;
    default:
      return false;
  }
}

function cloneChange(change: ArgumentMapHistoryChange) {
  return JSON.parse(JSON.stringify(change)) as ArgumentMapHistoryChange;
}
