import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";

import * as appLogger from "../logging/appLogging";
import {
  DeleteDocumentPayload,
  Doc,
  DocHandle,
  DocumentId,
  DocumentPayload,
  isValidDocumentId,
  Repo,
} from "@automerge/automerge-repo";
import { ArgumentMap } from "@sophistree/common";
import { triggerMigrationIfNecessary } from "./migrations";

/** A cache of repos we have opened keyed based on their sync server addresses. */
const reposBySyncServers = new Map<string, Repo>();

const storage = new IndexedDBStorageAdapter("sophistree");

async function getAllDocIds() {
  const chunks = await storage.loadRange([]);
  const docIds = new Set<DocumentId>();
  chunks.forEach(({ key: [docId] }) => {
    if (isValidDocumentId(docId)) {
      docIds.add(docId);
    }
  });
  return Array.from(docIds);
}

export async function getAllDocHandles(): Promise<DocHandle<ArgumentMap>[]> {
  const docIds = await getAllDocIds();
  return await Promise.all(
    docIds.map((id) => {
      const handle = storageOnlyRepo.find<ArgumentMap>(id);
      triggerMigrationIfNecessary(handle);
      return handle;
    }),
  );
}

export async function toDocs(handles: DocHandle<ArgumentMap>[]) {
  const docs = await Promise.all(
    handles.map((handle) => {
      return handle.doc();
    }),
  );
  return docs.flatMap((d) => (d ? [d] : []));
}

export async function getAllDocs(): Promise<Doc<ArgumentMap>[]> {
  const handles = await getAllDocHandles();
  return await toDocs(handles);
}

/** A repo to read all docs */
export const storageOnlyRepo = new Repo({ storage });

export function getRepo(syncServerAddresses: string[]) {
  const key = makeKey(syncServerAddresses);
  let repo = reposBySyncServers.get(key);
  if (!repo) {
    repo = makeRepo(syncServerAddresses);
    void persistStorage();
    reposBySyncServers.set(key, repo);
    applyCallbacksToRepo(repo);
  }
  return repo;
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

/**
 * Requests persisting storage so that Chrome won't clear the user's maps.
 *
 * https://web.dev/articles/persistent-storage#request_persistent_storage
 */
async function persistStorage() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    appLogger.info(`Persisted storage granted: ${isPersisted}`);
  }
}

function makeKey(strings: string[]): string {
  return Array.from(strings).sort().join("|");
}

const docChangeListeners = new Set<DocChangeListener>();

export type DocChangeListener = (
  payload: DocumentPayload | DeleteDocumentPayload,
) => void;

export function addDocChangeListener(callback: DocChangeListener) {
  docChangeListeners.add(callback);
  reposBySyncServers.values().forEach((r) => {
    r.on("document", callback);
    r.on("delete-document", callback);
  });
}

export function removeDocChangeListener(callback: DocChangeListener) {
  docChangeListeners.delete(callback);
  reposBySyncServers.values().forEach((r) => {
    r.off("document", callback);
    r.off("delete-document", callback);
  });
}

function applyCallbacksToRepo(repo: Repo) {
  docChangeListeners.forEach((callback) => {
    repo.on("document", callback);
    repo.on("delete-document", callback);
  });
}
