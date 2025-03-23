import { produce } from "immer";
import { PersistedState } from "redux-persist";
import { DocumentId } from "@automerge/automerge-repo";

import {
  ArgumentMap,
  ConclusionInfo,
  Entity,
  MediaExcerpt,
} from "@sophistree/common";

import { updateConclusions } from "./conclusions";
import { createDoc } from "../sync";
import { Heads } from "@automerge/automerge/next";
import { getDeviceId } from "../deviceId";

export const persistedStateVersion = 13;

type MapsState =
  | {
      maps: ArgumentMap[];
      activeMapId: DocumentId;
      selectedEntityIds: string[];
    }
  | undefined;

type AutomergeMapsState =
  | {
      maps?: ArgumentMap[];
      activeMapId?: DocumentId;
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
    const rootState = s as unknown as { entities: MapsState };
    rootState.entities = { maps, activeMapId, selectedEntityIds };
  }),
  8: produce((s: PersistedState) => {
    const state = s as unknown as { entities: AutomergeMapsState };
    const maps = state.entities?.maps;
    maps?.forEach((m) => {
      createDoc(m);
    });
    // maps are now stored in automerge
    delete state.entities?.maps;
    // Existing UUIDs are invalid now that we use automerge DocumentIds
    delete state.entities?.activeMapId;
  }),
};

export type MapMigrationIndex = keyof typeof mapMigrations;

export const migrateMap = (map: ArgumentMap, version: MapMigrationIndex) => {
  return produce(map, (draft: ArgumentMap) => {
    mapMigrations[version]?.(draft, undefined);
  });
};

interface MediaExcerptv2 extends MediaExcerpt {
  url?: string;
  canonicalUrl?: string;
  sourceName?: string;
}

export const mapMigrations = {
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
  9: (map: ArgumentMap) => {
    type UrlSourceInfo = {
      sourceNames: string[];
      urls: string[];
    };
    type UrlConclusionInfo = Omit<
      ConclusionInfo,
      "appearanceInfo" | "mediaExcerptJustificationInfo"
    > & {
      appearanceInfo: UrlSourceInfo;
      mediaExcerptJustificationInfo: UrlSourceInfo;
    };
    const conclusions = map.conclusions as unknown[] as UrlConclusionInfo[];
    for (const conclusion of conclusions) {
      conclusion.appearanceInfo = { sourceNames: [], urls: [] };
      conclusion.mediaExcerptJustificationInfo = { sourceNames: [], urls: [] };
      conclusion.propositionInfos = [];
    }
    updateConclusions(map);
  },
  10: (map: ArgumentMap) => {
    for (const conclusion of map.conclusions) {
      conclusion.appearanceInfo = { sourceNames: [], domains: [] };
      conclusion.mediaExcerptJustificationInfo = {
        sourceNames: [],
        domains: [],
      };
      conclusion.propositionInfos = [];
    }
    updateConclusions(map);
  },
  11: (map: ArgumentMap, heads: Heads | undefined) => {
    if (!("history" in map) || !map.history.length) {
      const deviceId = getDeviceId(map.automergeDocumentId);
      const userDisplayName =
        map.userInfoByDeviceId?.[deviceId].userDisplayName;
      map.history = [
        {
          deviceId,
          userDisplayName,
          heads,
          timestamp: new Date().toISOString(),
          changes: [{ type: "BeginHistory" }],
        },
      ];
    }
  },
  12: (map: ArgumentMap) => {
    if (!map.userInfoByDeviceId) {
      map.userInfoByDeviceId = {};
    }
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
