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

import * as appLogger from "../logging/appLogging";

const localRepo = (() => {
  const storage = new IndexedDBStorageAdapter("sophistree-local");
  const network = [
    new BroadcastChannelNetworkAdapter({ channelName: "local" }),
  ];
  return new Repo({ network, storage });
})();

const syncedRepo = (() => {
  const storage = new IndexedDBStorageAdapter("sophistree-synced");
  const network = [
    new BroadcastChannelNetworkAdapter({ channelName: "synced" }),
    new BrowserWebSocketClientAdapter("ws://localhost:3030"),
  ];
  return new Repo({ network, storage });
})();

export function addDocChangeListener(callback: () => void) {
  localRepo.on("document", callback);
  syncedRepo.on("document", callback);
  localRepo.on("delete-document", callback);
  syncedRepo.on("delete-document", callback);
}

export function removeDocChangeListener(callback: () => void) {
  localRepo.off("document", callback);
  syncedRepo.off("document", callback);
  localRepo.off("delete-document", callback);
  syncedRepo.off("delete-document", callback);
}

export function getAllDocs(): Doc<ArgumentMap>[] {
  const allHandles = [
    ...(Object.values(syncedRepo.handles) as DocHandle<ArgumentMap>[]),
    ...(Object.values(localRepo.handles) as DocHandle<ArgumentMap>[]),
  ];
  return allHandles
    .map((h) => h.docSync())
    .filter(Boolean) as Doc<ArgumentMap>[];
}

export interface NewArgumentMap
  extends Omit<ArgumentMap, "automergeDocumentId"> {
  automergeDocumentId?: string;
}

export function createDoc(map: NewArgumentMap) {
  const handle = localRepo.create(map);
  handle.change((map) => {
    map.automergeDocumentId = handle.documentId;
  });
  return handle;
}

export function deleteDoc(id: DocumentId) {
  localRepo.delete(id);
  syncedRepo.delete(id);
}

export function isSynced(id: DocumentId) {
  return !!syncedRepo.find(id).docSync();
}

export function syncDoc(id: DocumentId) {
  const doc = localRepo.find(id).docSync();
  if (doc) {
    const newId = syncedRepo.create(doc).documentId;
    localRepo.delete(id);
    return newId;
  } else {
    return syncedRepo.find(id).documentId;
  }
}

export function unSyncDoc(id: DocumentId) {
  const doc = syncedRepo.find(id).docSync();
  if (doc) {
    const newId = localRepo.create(doc).documentId;
    syncedRepo.delete(id);
    return newId;
  } else {
    return localRepo.find(id).documentId;
  }
}

export function getDocHandle(id: DocumentId): DocHandle<ArgumentMap> {
  if (!isValidDocumentId(id)) {
    throw new Error(`Invalid document ID: ${id as string}`);
  }
  const localHandle = localRepo.find<ArgumentMap>(id);
  const syncedHandle = syncedRepo.find<ArgumentMap>(id);
  if (localHandle.docSync() && syncedHandle.docSync()) {
    appLogger.error(
      `Automerge doc ${id} exists in both local and synced repos.`,
    );
    // localRepo.delete(id);
  }
  if (syncedHandle.docSync()) {
    return syncedHandle;
  } else {
    return localHandle;
  }
}

export function getDoc(id: DocumentId) {
  return getDocHandle(id).docSync();
}
