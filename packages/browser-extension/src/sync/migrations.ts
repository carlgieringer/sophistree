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

export function triggerMigrationIfNecessary(handle: DocHandle<ArgumentMap>) {
  ensureMapMigrations(handle).catch((reason) =>
    appLogger.error("Failed to migrate doc", reason),
  );
}

async function ensureMapMigrations(handle: DocHandle<ArgumentMap>) {
  const doc = await handle.doc();
  if (!doc) {
    throw new Error("Unable to get doc for migration");
  }
  let currentVersion = doc.version || minAutomergeMapVersion;
  if (currentVersion < persistedStateVersion) {
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
