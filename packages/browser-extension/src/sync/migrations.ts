import { DocHandle } from "@automerge/automerge-repo";
import { ArgumentMap } from "@sophistree/common";

import {
  MapMigrationIndex,
  mapMigrations,
  persistedStateVersion,
} from "../store/migrations";
import * as appLogger from "../logging/appLogging";

// The last version before we switched to Automerge. Automerge maps missing a version
// are implied to have this version.
const minAutomergeMapVersion = 8;

const migratingDocumentIds = new Set<string>();
const MIGRATE_CHECK_INTERVAL_MS = 100;
const MIGRATE_TIMEOUT_MS = 10_000;

export function ensureMapMigrationsAsync(handle: DocHandle<ArgumentMap>) {
  ensureMapMigrations(handle).catch((reason) => {
    appLogger.error(`Failed to migrate map ${handle.documentId}: ${reason}`);
  });
}

export function ensureMapMigrations(handle: DocHandle<ArgumentMap>) {
  // Try not to migrate multiple times, although there is a race condition if ensureMapMigrations
  // is called simultaneously.
  if (migratingDocumentIds.has(handle.documentId)) {
    return Promise.resolve();
  }
  migratingDocumentIds.add(handle.documentId);
  return new Promise<void>((resolve, reject) => {
    applyMigrationIfReady(handle, resolve);
    rejectAfterTimeout(reject, handle.documentId);
  });
}

function applyMigrationIfReady(
  handle: DocHandle<ArgumentMap>,
  resolve: (value: void) => void,
) {
  if (handle.isReady()) {
    applyMigrations(handle);
    migratingDocumentIds.delete(handle.documentId);
    resolve();
  } else {
    setTimeout(() => {
      applyMigrationIfReady(handle, resolve);
    }, MIGRATE_CHECK_INTERVAL_MS);
  }
}

function applyMigrations(handle: DocHandle<ArgumentMap>) {
  const doc = handle.docSync();
  if (!doc) {
    throw new Error(`Unable to get doc for migration: ${handle.documentId}`);
  }
  appLogger.info(`applyMigrations ${handle.documentId}`);
  let currentVersion = doc.version || minAutomergeMapVersion;
  if (currentVersion < persistedStateVersion) {
    appLogger.info(
      `Migrating ${handle.documentId} from ${currentVersion} to persistedStateVersion`,
    );
    handle.change((map) => {
      while (currentVersion <= persistedStateVersion) {
        mapMigrations[currentVersion as MapMigrationIndex]?.(
          map,
          handle.heads(),
        );
        map.version = currentVersion;
        currentVersion++;
      }
    });
  }
}

function rejectAfterTimeout(
  reject: (reason: unknown) => void,
  documentId: string,
) {
  setTimeout(() => {
    reject(
      new Error(
        `Failed to migrate document ${documentId} after ${MIGRATE_TIMEOUT_MS} ms`,
      ),
    );
    migratingDocumentIds.delete(documentId);
  }, MIGRATE_TIMEOUT_MS);
}
