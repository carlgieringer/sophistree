import { produce } from "immer";
import {
  ArgumentMap,
  Entity,
  MediaExcerpt,
  updateConclusions,
} from "./entitiesSlice";

export const persistedStateVersion = 4;

export const reduxPersistMigrations = {
  0: (state: unknown) => state,
  1: (state: unknown) => state,
  2: produce((state: { maps: ArgumentMap[] }) => {
    state.maps.forEach((map: ArgumentMap) => {
      mapMigrations[2](map);
    });
  }),
  3: produce((state: { maps: ArgumentMap[] }) => {
    state.maps.forEach((map: ArgumentMap) => {
      mapMigrations[3](map);
    });
  }),
  4: produce((state: { maps: ArgumentMap[] }) => {
    state.maps.forEach((map: ArgumentMap) => {
      mapMigrations[4](map);
    });
  }),
};

export const migrateMap = (
  map: ArgumentMap,
  version: keyof typeof mapMigrations,
) => {
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
