import {
  DocHandle,
  DocumentId,
  isValidDocumentId,
} from "@automerge/automerge-repo";

import { ArgumentMap } from "@sophistree/common";
import {
  getSyncServerAddresses,
  setSyncServerAddresses,
} from "./syncServerStorage";
import { getRepo } from "./repos";
import { ensureMapMigrations } from "./migrations";

export function createDoc(map: NewArgumentMap) {
  const repo = getRepo([]);
  const handle = repo.create(map);
  handle.change((map) => {
    map.automergeDocumentId = handle.documentId;
  });
  return handle;
}

export async function getDocHandle(
  id: DocumentId,
): Promise<DocHandle<ArgumentMap>> {
  if (!isValidDocumentId(id)) {
    throw new Error(`Invalid document ID: ${id as string}`);
  }
  const syncServerAddresses = getSyncServerAddresses(id);
  const handle = await getRepo(syncServerAddresses).find<ArgumentMap>(id);

  ensureMapMigrations(handle);

  return handle;
}

export async function getDoc(id: DocumentId) {
  const handle = await getDocHandle(id);
  return handle.doc();
}

export async function openDoc(
  id: DocumentId,
  syncServerAddresses: string[],
): Promise<DocHandle<ArgumentMap>> {
  setSyncServerAddresses(id, syncServerAddresses);
  const handle = await getRepo(syncServerAddresses).find<ArgumentMap>(id);

  ensureMapMigrations(handle);

  return handle;
}

export async function setDocSyncServerAddresses(
  oldId: DocumentId,
  syncServerAddresses: string[],
) {
  const oldRepo = getRepoForDoc(oldId);
  const oldHandle = await oldRepo.find<ArgumentMap>(oldId);
  if (!oldHandle) {
    throw new Error(`Could not find document with ID: ${oldId}`);
  }
  const doc = oldHandle.doc();
  const newRepo = getRepo(syncServerAddresses);
  const handle = newRepo.create<ArgumentMap>(doc);
  const newId = handle.documentId;
  handle.change((map) => {
    map.automergeDocumentId = newId;
  });
  oldRepo.delete(oldId);
  setSyncServerAddresses(newId, syncServerAddresses, oldId);

  ensureMapMigrations(handle);

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
