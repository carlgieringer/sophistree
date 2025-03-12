import {
  DocHandle,
  DocumentId,
  isValidDocumentId,
} from "@automerge/automerge-repo";
import { getActorId } from "@automerge/automerge/next";

import { ArgumentMap } from "@sophistree/common";

import { triggerMigrationIfNecessary } from "./migrations";
import { getRepo } from "./repos";
import {
  getSyncServerAddresses,
  setSyncServerAddresses,
} from "./syncServerStorage";
import { broadcastDocDeletion } from "./broadcast";

export function createDoc(map: NewArgumentMap) {
  const repo = getRepo([]);
  const handle = repo.create(map);
  handle.change((map) => {
    map.automergeDocumentId = handle.documentId;
    map.history = [
      {
        actorId: getActorId(map),
        heads: handle.heads(),
        timestamp: new Date().toISOString(),
        changes: [
          {
            type: "CreateMap",
            name: map.name,
          },
        ],
      },
    ];
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
  const oldHandle = oldRepo.find<ArgumentMap>(oldId);
  triggerMigrationIfNecessary(oldHandle);
  const doc = oldHandle.docSync();
  oldRepo.delete(oldId);
  broadcastDocDeletion(oldId);

  const newRepo = getRepo(syncServerAddresses);
  const handle = newRepo.create<ArgumentMap>(doc);
  const newId = handle.documentId;
  handle.change((map) => {
    map.automergeDocumentId = newId;

    map.history.push({
      actorId: getActorId(map),
      heads: handle.heads(),
      timestamp: new Date().toISOString(),
      changes: [
        syncServerAddresses.length
          ? {
              type: "StartRemoteSync",
              syncServerAddresses,
            }
          : {
              type: "EndRemoteSync",
            },
      ],
    });
  });
  setSyncServerAddresses(newId, syncServerAddresses, oldId);

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
