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
import { ensureMapMigrationsAsync } from "./migrations";

/** A cache of repos we have opened keyed based on their sync server addresses. */
const reposBySyncServers = new Map<string, Repo>();

const storage = new IndexedDBStorageAdapter("sophistree");

/** A repo for local docs and to read all docs. */
const localRepo = new Repo({
  network: [
    new BroadcastChannelNetworkAdapter({
      channelName: "sophistree-sync",
    }),
  ],
  storage,
});

reposBySyncServers.set(makeKey([]), localRepo);

async function getAllDocIds() {
  const chunks = await storage.loadRange([]);
  const docIds = new Set<DocumentId>();
  chunks.forEach(({ key: [docId, type] }) => {
    // Ignore storage-adapter-id.
    // Deleted maps still have sync-state hanging around for some reason. Ignore
    // docs unless they have a snapshot or incremental data.
    if (isValidDocumentId(docId) && type !== "sync-state") {
      docIds.add(docId);
    }
  });
  return Array.from(docIds);
}

export async function getAllDocHandles(): Promise<DocHandle<ArgumentMap>[]> {
  const docIds = await getAllDocIds();
  return await Promise.all(
    docIds.map((id) => {
      const handle = localRepo.find<ArgumentMap>(id);
      ensureMapMigrationsAsync(handle);
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

export function getRepo(syncServerAddresses: string[]) {
  const key = makeKey(syncServerAddresses);
  let repo = reposBySyncServers.get(key);
  if (!repo) {
    if (!syncServerAddresses.length) {
      throw new Error("Could not find local-only repo.");
    }
    repo = makeRemoteRepo(syncServerAddresses);
    void persistStorage();
    reposBySyncServers.set(key, repo);
    addCallbacksToRepo(repo);
  }
  return repo;
}

function makeRemoteRepo(syncServerAddresses: string[]) {
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

export function addRepoDocChangeListener(callback: DocChangeListener) {
  docChangeListeners.add(callback);
  reposBySyncServers.values().forEach((r) => {
    r.on("document", callback);
    r.on("delete-document", callback);
  });
}

export function removeRepoDocChangeListener(callback: DocChangeListener) {
  docChangeListeners.delete(callback);
  reposBySyncServers.values().forEach((r) => {
    r.off("document", callback);
    r.off("delete-document", callback);
  });
}

function addCallbacksToRepo(repo: Repo) {
  docChangeListeners.forEach((callback) => {
    repo.on("document", callback);
    repo.on("delete-document", callback);
  });
}
