import {
  Doc,
  DocHandle,
  DocumentId,
  Repo,
  isValidDocumentId,
} from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";

import { ArgumentMap } from "@sophistree/common";
import {
  getDefaultSyncServerAddresses,
  addListener,
} from "./defaultSyncServerAddresses";

const storage = new IndexedDBStorageAdapter("sophistree");
const storageOnlyRepo = new Repo({ storage });
const reposBySyncServers = new Map<string, Repo>();
const activeDocChangeCallbacks = new Set<() => void>();

// Initialize with addresses from storage
let defaultRepo: Repo;
let defaultSyncServerAddresses: string[] = [];

// Initialize the default repo
void (async function initializeDefaultRepo() {
  try {
    defaultSyncServerAddresses = await getDefaultSyncServerAddresses();
    defaultRepo = makeRepo(defaultSyncServerAddresses);
    reposBySyncServers.set(makeKey(defaultSyncServerAddresses), defaultRepo);
  } catch (error) {
    console.error("Failed to initialize default repo:", error);
    // Use empty array as fallback
    defaultSyncServerAddresses = [];
    defaultRepo = makeRepo([]);
    reposBySyncServers.set(makeKey([]), defaultRepo);
  }
})();

addListener(updateDefaultSyncServerAddresses);

// Export function to update default repo when addresses change
export function updateDefaultSyncServerAddresses(addresses: string[]) {
  defaultSyncServerAddresses = addresses;
  defaultRepo = makeRepo(addresses);
  reposBySyncServers.set(makeKey(addresses), defaultRepo);
}

function makeRepo(syncServerAddresses: string[]) {
  if (syncServerAddresses.length === 0) {
    return new Repo({
      network: [new BroadcastChannelNetworkAdapter()],
      storage,
    });
  }
  const network = syncServerAddresses.map(
    (a) => new BrowserWebSocketClientAdapter(a),
  );
  return new Repo({
    network,
    storage,
  });
}

function getRepo(syncServerAddresses: string[]) {
  const key = makeKey(syncServerAddresses);
  let repo = reposBySyncServers.get(key);
  if (!repo) {
    repo = makeRepo(syncServerAddresses);
    reposBySyncServers.set(key, repo);
    applyCallbacksToRepo(repo);
  }
  return repo;
}

function makeKey(strings: string[]): string {
  return strings.join("|");
}

export function getAllDocs(): Doc<ArgumentMap>[] {
  const allHandles = Object.values(
    storageOnlyRepo.handles,
  ) as DocHandle<ArgumentMap>[];
  return allHandles
    .map((h) => h.docSync())
    .filter(Boolean) as Doc<ArgumentMap>[];
}

export interface NewArgumentMap
  extends Omit<ArgumentMap, "automergeDocumentId"> {
  automergeDocumentId?: string;
}

export function createDoc(map: NewArgumentMap) {
  const handle = defaultRepo.create(map);
  handle.change((map) => {
    map.automergeDocumentId = handle.documentId;
  });
  return handle;
}

export function getDocHandle(id: DocumentId): DocHandle<ArgumentMap> {
  if (!isValidDocumentId(id)) {
    throw new Error(`Invalid document ID: ${id as string}`);
  }
  const syncServerAddresses = getSyncServerAddresses(id);
  return getRepo(syncServerAddresses).find<ArgumentMap>(id);
}

export function getDoc(id: DocumentId) {
  return getDocHandle(id).docSync();
}

export function openDoc(
  id: DocumentId,
  syncServerAddresses: string[],
): DocHandle<ArgumentMap> {
  if (syncServerAddresses.length) {
    setSyncServerAddresses(id, syncServerAddresses);
    return getRepo(syncServerAddresses).find(id);
  }
  setSyncServerAddresses(id, defaultSyncServerAddresses);
  return defaultRepo.find(id);
}

export function setDocSyncServerAddresses(
  oldId: DocumentId,
  syncServerAddresses: string[],
) {
  const oldRepo = getRepoForDoc(oldId);
  const doc = oldRepo.find<ArgumentMap>(oldId).docSync();
  const newRepo = getRepo(syncServerAddresses);
  const handle = newRepo.create<ArgumentMap>(doc);
  const newId = handle.documentId;
  handle.change((map) => {
    map.automergeDocumentId = newId;
  });
  oldRepo.delete(oldId);
  setSyncServerAddresses(newId, syncServerAddresses, oldId);
  return newId;
}

function getRepoForDoc(id: DocumentId) {
  const syncServerAddresses = getSyncServerAddresses(id);
  return getRepo(syncServerAddresses);
}

export function deleteDoc(id: DocumentId) {
  reposBySyncServers.values().forEach((r) => r.delete(id));
}

export function isRemote(id: DocumentId) {
  return !!getSyncServerAddresses(id).length;
}

// Per-document sync server addresses
const syncServerAddressesLocalStorageKey =
  "SophistreeSyncServerAddressesByAutomergeDocumentId";

function getSyncServerAddresses(id: DocumentId): string[] {
  const value = window.localStorage.getItem(syncServerAddressesLocalStorageKey);
  if (!value) {
    return [];
  }
  const syncServerAddressesById = JSON.parse(value) as Record<string, string[]>;
  return syncServerAddressesById[id] || [];
}

function setSyncServerAddresses(
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

export function addDocChangeListener(callback: () => void) {
  activeDocChangeCallbacks.add(callback);
  reposBySyncServers.values().forEach((r) => {
    r.on("document", callback);
    r.on("delete-document", callback);
  });
}

export function removeDocChangeListener(callback: () => void) {
  activeDocChangeCallbacks.delete(callback);
  reposBySyncServers.values().forEach((r) => {
    r.off("document", callback);
    r.off("delete-document", callback);
  });
}

function applyCallbacksToRepo(repo: Repo) {
  activeDocChangeCallbacks.forEach((callback) => {
    repo.on("document", callback);
    repo.on("delete-document", callback);
  });
}
