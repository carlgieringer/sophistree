import {
  DocHandle,
  DocumentId,
  isValidDocumentId,
} from "@automerge/automerge-repo";
import { ArgumentMap } from "@sophistree/common";
import { formatHistory } from "./history";
import {
  getSyncServerAddresses,
  setSyncServerAddresses,
} from "./syncServerStorage";
import { getRepo } from "./repos";
import { triggerMigrationIfNecessary } from "./migrations";

export function createDoc(map: NewArgumentMap) {
  const repo = getRepo([]);
  const handle = repo.create(map);
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
  const handle = getRepo(syncServerAddresses).find<ArgumentMap>(id);

  triggerMigrationIfNecessary(handle);

  return handle;
}

export function getDoc(id: DocumentId) {
  return getDocHandle(id).docSync();
}

export function getDocHistory(id: DocumentId) {
  const doc = getDoc(id);
  if (!doc) {
    return [];
  }
  return formatHistory(doc);
}

export function openDoc(
  id: DocumentId,
  syncServerAddresses: string[],
): DocHandle<ArgumentMap> {
  setSyncServerAddresses(id, syncServerAddresses);
  const handle = getRepo(syncServerAddresses).find<ArgumentMap>(id);

  triggerMigrationIfNecessary(handle);

  return handle;
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

  triggerMigrationIfNecessary(handle);

  return newId;
}

export function deleteDoc(id: DocumentId) {
  getRepoForDoc(id).delete(id);
}

export function isRemote(id: DocumentId) {
  return !!getSyncServerAddresses(id).length;
}

function getRepoForDoc(id: DocumentId) {
  const syncServerAddresses = getSyncServerAddresses(id);
  return getRepo(syncServerAddresses);
}

export interface NewArgumentMap
  extends Omit<ArgumentMap, "automergeDocumentId"> {
  automergeDocumentId?: string;
}
