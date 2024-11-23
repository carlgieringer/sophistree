import { produce } from "immer";
import {
  ArgumentMap,
  Entity,
  MediaExcerpt,
  updateConclusions,
} from "./entitiesSlice";
import { PersistedState } from "redux-persist";
import { type RootState } from "./store";

export const persistedStateVersion = 7;

type MapsState =
  | {
      maps: ArgumentMap[];
      activeMapId: string;
      selectedEntityIds: string[];
    }
  | undefined;

export const reduxPersistMigrations = {
  0: (state: PersistedState) => state,
  1: (state: PersistedState) => state,
  2: produce((s: PersistedState) => {
    const state = s as MapsState;
    state?.maps.forEach((map: ArgumentMap) => {
      mapMigrations[2](map);
    });
  }),
  3: produce((s: PersistedState) => {
    const state = s as MapsState;
    state?.maps.forEach((map: ArgumentMap) => {
      mapMigrations[3](map);
    });
  }),
  4: produce((s: PersistedState) => {
    const state = s as MapsState;
    state?.maps.forEach((map: ArgumentMap) => {
      mapMigrations[4](map);
    });
  }),
  5: produce((s: PersistedState) => {
    const state = s as MapsState;
    state?.maps.forEach((map: ArgumentMap) => {
      mapMigrations[5](map);
    });
  }),
  6: produce((s: PersistedState) => {
    const state = s as MapsState;
    state?.maps.forEach((map: ArgumentMap) => {
      mapMigrations[6](map);
    });
  }),
  7: produce((s: PersistedState) => {
    const state = s as MapsState;
    if (!state) {
      return;
    }
    const { maps, activeMapId, selectedEntityIds } = state;
    if (s && "maps" in s) delete s.maps;
    if (s && "activeMapId" in s) delete s.activeMapId;
    if (s && "selectedEntityIds" in s) delete s.selectedEntityIds;
    const rootState = s as unknown as RootState;
    rootState.entities = { maps, activeMapId, selectedEntityIds };
  }),
};

export type MapMigrationIndex = keyof typeof mapMigrations;

export const migrateMap = (map: ArgumentMap, version: MapMigrationIndex) => {
  return produce(map, (draft: ArgumentMap) => {
    mapMigrations[version](draft);
  });
};

interface MediaExcerptv2 extends MediaExcerpt {
  url?: string;
  canonicalUrl?: string;
  sourceName?: string;
}

const mapMigrations = {
  0: (map: unknown) => map,
  1: (map: unknown) => map,
  2: (map: { entities: unknown[] }) => {
    map.entities.forEach((e: unknown) => {
      const entity = e as MediaExcerptv2;
      if (entity.type === "MediaExcerpt") {
        const { url, canonicalUrl, sourceName } = entity;
        entity.urlInfo = { url: url!, canonicalUrl };
        entity.sourceInfo = { name: sourceName! };
        delete entity.url;
        delete entity.canonicalUrl;
        delete entity.sourceName;
      }
    });
  },
  3: (map: ArgumentMap) => {
    updateConclusions(map);
  },
  4: (map: ArgumentMap) => {
    removeDuplicateJustifications(map);
  },
  5: (map: ArgumentMap) => {
    removeAnchorTextPosition(map);
  },
  6: (map: ArgumentMap) => {
    addSourceNameOverrides(map);
  },
};

const removeDuplicateJustifications = (map: ArgumentMap) => {
  const uniqueJustifications = new Set();
  map.entities = map.entities.filter((entity: Entity) => {
    if (entity.type !== "Justification") return true;

    const key = `${entity.basisId}-${entity.targetId}`;
    if (uniqueJustifications.has(key)) return false;

    uniqueJustifications.add(key);
    return true;
  });
};

const removeAnchorTextPosition = (map: ArgumentMap) => {
  map.entities.forEach((entity: Entity) => {
    if (entity.type !== "MediaExcerpt") return;
    delete (entity.domAnchor as unknown as { position: unknown }).position;
    return entity;
  });
};

const addSourceNameOverrides = (map: ArgumentMap) => {
  map.sourceNameOverrides = {};
};
