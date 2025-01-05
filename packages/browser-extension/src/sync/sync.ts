import {
  Doc,
  DocHandle,
  DocumentId,
  NetworkAdapter,
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

const remoteRepo = (() => {
  const storage = new IndexedDBStorageAdapter("sophistree-remote");
  const network: NetworkAdapter[] = [
    new BroadcastChannelNetworkAdapter({ channelName: "remote" }),
    new BrowserWebSocketClientAdapter("ws://localhost:3030"),
  ];
  return new Repo({ network, storage });
})();

export function addDocChangeListener(callback: () => void) {
  localRepo.on("document", callback);
  remoteRepo.on("document", callback);
  localRepo.on("delete-document", callback);
  remoteRepo.on("delete-document", callback);
}

export function removeDocChangeListener(callback: () => void) {
  localRepo.off("document", callback);
  remoteRepo.off("document", callback);
  localRepo.off("delete-document", callback);
  remoteRepo.off("delete-document", callback);
}

export function getAllDocs(): Doc<ArgumentMap>[] {
  const allHandles = [
    ...(Object.values(remoteRepo.handles) as DocHandle<ArgumentMap>[]),
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

export function openDoc(id: DocumentId): DocHandle<ArgumentMap> {
  return remoteRepo.find(id);
}

export function deleteDoc(id: DocumentId) {
  localRepo.delete(id);
  remoteRepo.delete(id);
}

export function isRemote(id: DocumentId) {
  return !!remoteRepo.find(id).docSync();
}

export function syncDocRemotely(id: DocumentId) {
  const doc = localRepo.find<ArgumentMap>(id).docSync();
  if (doc) {
    const handle = remoteRepo.create<ArgumentMap>(doc);
    const newId = handle.documentId;
    handle.change((map) => {
      map.automergeDocumentId = newId;
    });
    localRepo.delete(id);
    return newId;
  } else {
    return remoteRepo.find(id).documentId;
  }
}

export function syncDocLocally(id: DocumentId) {
  const doc = remoteRepo.find<ArgumentMap>(id).docSync();
  if (doc) {
    const handle = localRepo.create<ArgumentMap>(doc);
    const newId = handle.documentId;
    handle.change((map) => {
      map.automergeDocumentId = newId;
    });
    remoteRepo.delete(id);
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
  const remoteHandle = remoteRepo.find<ArgumentMap>(id);
  if (localHandle.docSync() && remoteHandle.docSync()) {
    appLogger.error(
      `Automerge doc ${id} exists in both local and remote repos. Deleting local doc.`,
    );
    localRepo.delete(id);
  }
  if (remoteHandle.docSync()) {
    return remoteHandle;
  } else {
    return localHandle;
  }
}

export function getDoc(id: DocumentId) {
  return getDocHandle(id).docSync();
}
