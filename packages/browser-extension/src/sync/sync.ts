import {
  DocHandle,
  DocumentId,
  isValidDocumentId,
} from "@automerge/automerge-repo";
import { getDeviceId } from "../deviceId";

import { ArgumentMap } from "@sophistree/common";

import { ensureMapMigrationsAsync } from "./migrations";
import { getRepo } from "./repos";
import {
  getSyncServerAddresses,
  setSyncServerAddresses,
} from "./syncServerStorage";
import { broadcastDocDeletion } from "./broadcast";
import { getUserDisplayName } from "../userDisplayName";

export function createDoc(map: NewArgumentMap) {
  const repo = getRepo([]);
  const handle = repo.create(map);
  handle.change((map) => {
    const automergeDocumentId = handle.documentId;
    map.automergeDocumentId = automergeDocumentId;
    const deviceId = getDeviceId(automergeDocumentId);
    const userDisplayName = getUserDisplayName();
    map.userInfoByDeviceId[deviceId] = {
      userDisplayName,
    };
    map.history = [
      {
        deviceId,
        userDisplayName,
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

  ensureMapMigrationsAsync(handle);

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

  ensureMapMigrationsAsync(handle);

  return handle;
}

export function setDocSyncServerAddresses(
  oldId: DocumentId,
  syncServerAddresses: string[],
) {
  const oldRepo = getRepoForDoc(oldId);
  const oldHandle = oldRepo.find<ArgumentMap>(oldId);
  ensureMapMigrationsAsync(oldHandle);
  const doc = oldHandle.docSync();
  oldRepo.delete(oldId);
  broadcastDocDeletion(oldId);

  const newRepo = getRepo(syncServerAddresses);
  const handle = newRepo.create<ArgumentMap>(doc);
  const newId = handle.documentId;
  handle.change((map) => {
    map.automergeDocumentId = newId;

    const deviceId = getDeviceId(map.automergeDocumentId);
    const userDisplayName = getUserDisplayName();
    map.userInfoByDeviceId[deviceId] = {
      userDisplayName,
    };

    map.history.push({
      deviceId,
      userDisplayName,
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
