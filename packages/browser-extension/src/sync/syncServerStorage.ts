import { DocumentId } from "@automerge/automerge-repo";

/** Key for storing doc sync preferences in local storage. */
const syncServerAddressesLocalStorageKey =
  "SophistreeSyncServerAddressesByAutomergeDocumentId";

export function getSyncServerAddresses(id: DocumentId): string[] {
  const value = window.localStorage.getItem(syncServerAddressesLocalStorageKey);
  if (!value) {
    return [];
  }
  const syncServerAddressesById = JSON.parse(value) as Record<string, string[]>;
  return syncServerAddressesById[id] || [];
}

export function setSyncServerAddresses(
  id: DocumentId,
  syncServerAddresses: string[],
  oldId?: DocumentId,
) {
  const value = window.localStorage.getItem(syncServerAddressesLocalStorageKey);
  const syncServerAddressesById = (value ? JSON.parse(value) : {}) as Record<
    string,
    string[]
  >;
  syncServerAddressesById[id] = syncServerAddresses;
  if (oldId) {
    delete syncServerAddressesById[oldId];
  }
  window.localStorage.setItem(
    syncServerAddressesLocalStorageKey,
    JSON.stringify(syncServerAddressesById),
  );
}
