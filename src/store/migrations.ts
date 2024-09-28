import { produce, current } from "immer";
import { updateConclusions } from "./entitiesSlice";

export const persistedStateVersion = 3;

export const reduxPersistMigrations = {
  0: (state: any) => state,
  1: (state: any) => state,
  2: produce((state: any) => {
    state.maps.forEach((map: any) => {
      mapMigrations[2](map);
    });
  }),
  3: produce((state: any) => {
    state.maps.forEach((map: any) => {
      mapMigrations[3](map);
    });
  }),
};

export const migrateMap = (map: any, version: keyof typeof mapMigrations) => {
  return produce(map, (draft: any) => {
    mapMigrations[version](draft);
  });
};

const mapMigrations = {
  0: (map: any) => map,
  1: (map: any) => map,
  2: (map: any) => {
    map.entities.forEach((entity: any) => {
      if (entity.type === "MediaExcerpt") {
        const { url, canonicalUrl, sourceName } = entity;
        entity.urlInfo = { url, canonicalUrl };
        entity.sourceInfo = { name: sourceName };
        delete entity.url;
        delete entity.canonicalUrl;
        delete entity.sourceName;
      }
    });
  },
  3: (map: any) => {
    updateConclusions(map);
  },
};
