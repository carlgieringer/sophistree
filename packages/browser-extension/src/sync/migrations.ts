import { DocHandle } from "@automerge/automerge-repo";
import { ArgumentMap } from "@sophistree/common";

import {
  MapMigrationIndex,
  mapMigrations,
  persistedStateVersion,
} from "../store/migrations";

// The last version before we switched to Automerge. Automerge maps missing a version
// are implied to have this version.
const minAutomergeMapVersion = 8;

export function ensureMapMigrations(handle: DocHandle<ArgumentMap>) {
  const doc = handle.doc();
  let currentVersion = doc.version || minAutomergeMapVersion;
  if (currentVersion < persistedStateVersion) {
    handle.change((map) => {
      while (currentVersion <= persistedStateVersion) {
        mapMigrations[currentVersion as MapMigrationIndex]?.(map);
        map.version = currentVersion;
        currentVersion++;
      }
    });
  }
}
