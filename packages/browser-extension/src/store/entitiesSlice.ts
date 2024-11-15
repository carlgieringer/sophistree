import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { DomAnchor } from "tapestry-highlights";
import deepEqual from "deep-equal";
import merge from "lodash.merge";

import * as appLogger from "../logging/appLogging";
import { notifyTabsOfDeletedMediaExcerpt } from "../extension/messages";

type BaseEntity = {
  id: string;
  // if explicitVisibility is missing, falls back to autoVisibility
  explicitVisibility?: Visibility | undefined;
  autoVisibility: Visibility;
};

type Visibility = "Visible" | "Hidden";

export const defaultVisibilityProps = { autoVisibility: "Visible" as const };

export type Entity =
  | Proposition
  | PropositionCompound
  | Justification
  | MediaExcerpt
  | Appearance;

export type EntityType = Entity["type"];

export interface Proposition extends BaseEntity {
  type: "Proposition";
  text: string;
}

export interface PropositionCompound extends BaseEntity {
  type: "PropositionCompound";
  atomIds: string[];
}

export type Polarity = "Positive" | "Negative";

export interface Justification extends BaseEntity {
  type: "Justification";
  basisId: string;
  targetId: string;
  polarity: Polarity;
}

export type MediaExcerpt = BaseEntity & {
  type: "MediaExcerpt";
  quotation: string;
  urlInfo: UrlInfo;
  sourceInfo: SourceInfo;
  domAnchor: DomAnchor;
};

export interface UrlInfo {
  url: string;
  canonicalUrl?: string;
  pdfFingerprint?: string;
}

interface SourceInfo {
  name: string;
}

export interface Appearance extends BaseEntity {
  type: "Appearance";
  apparitionId: string;
  mediaExcerptId: string;
}

interface DragPayload {
  sourceId: string;
  targetId: string;
  polarity?: Polarity;
}

/**
 * Conclusions are any roots of justification trees in the map. To count as a
 * conclusion, a proposition must be the target of at least one justification,
 * and it must not be the basis of any justification.
 *
 * A ConclusionInfo must have at least one propositionId. It can have multiple
 * if all those propositions have the same source names and URLs. Ideally
 * Conclusions' propositionIds are combined into the fewest ConclusionInfos for
 * streamlined display.
 */
interface ConclusionInfo {
  /** The proposition IDs of the conclusions. */
  propositionIds: string[];
  /** The distinct sourceInfo.names for appearances of the proposition.  */
  sourceNames: string[];
  /** The distinct preferred URLs for appearances of the proposition. */
  urls: string[];
}

export interface ArgumentMap {
  id: string;
  name: string;
  entities: Entity[];
  /** Conclusions summarize the main points of the argument */
  conclusions: ConclusionInfo[];
  /**
   * Some sources (especially PDFs) have poor names. We track what the user
   * last override MediaExcerpt sources to be, and automatically apply them
   * when new MediaExcerpts are created for the same URL. (We store overrides
   * for both the canonical and plain URL, preferring the override matching the
   * URL.)
   */
  sourceNameOverrides: Record<string, string>;
}

const initialState = {
  activeMapId: undefined as string | undefined,
  maps: [] as ArgumentMap[],
  selectedEntityIds: [] as string[],
};

type State = typeof initialState;

const emptySelection: string[] = [];

export interface AddMediaExcerptData {
  id: string;
  quotation: string;
  url: string;
  canonicalUrl?: string;
  pdfFingerprint?: string;
  sourceName: string;
  domAnchor: DomAnchor;
}

export const syncMap = createAsyncThunk(
  "entities/syncMap",
  async (_, { getState }) => {
    const state = getState() as { entities: State };
    const activeMapId = state.entities.activeMapId;
    if (!activeMapId) {
      throw new Error("No active map to sync");
    }

    const activeMap = state.entities.maps.find((map) => map.id === activeMapId);
    if (!activeMap) {
      throw new Error("Active map not found");
    }

    // Get the auth token
    const { token } = await chrome.identity.getAuthToken({
      interactive: false,
    });
    if (!token) {
      throw new Error("Not authenticated");
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "X-Auth-Provider": "google",
    };

    // Check if map exists
    const checkResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/argument-maps/${activeMapId}`,
      {
        headers: authHeaders,
      },
    );

    const mapExists = checkResponse.ok;
    const method = mapExists ? "PUT" : "POST";
    const url = mapExists
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/argument-maps/${activeMapId}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/argument-maps`;

    const response = await fetch(url, {
      method,
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: activeMap,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to ${mapExists ? "update" : "create"} map: ${response.statusText}`,
      );
    }

    return (await response.json()) as ArgumentMap;
  },
);

export const entitiesSlice = createSlice({
  name: "entities",
  initialState,
  reducers: {
    createMap(state, action: PayloadAction<Partial<ArgumentMap>>) {
      const newMap: ArgumentMap = {
        name: "New map",
        entities: [],
        conclusions: [],
        ...action.payload,
        // Overwrite any ID from the payload to ensure that uploaded maps do not replace existing ones.
        id: uuidv4(),
        sourceNameOverrides: {},
      };
      state.maps.push(newMap);
      state.activeMapId = newMap.id;
    },
    deleteMap(state, action: PayloadAction<string>) {
      state.maps = state.maps.filter((map) => map.id !== action.payload);
      if (state.activeMapId === action.payload) {
        state.activeMapId = state.maps[0]?.id;
      }
    },
    setActiveMap(state, action: PayloadAction<string | undefined>) {
      state.activeMapId = action.payload;
    },
    renameActiveMap(state, action: PayloadAction<string>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (activeMap) {
        activeMap.name = action.payload;
      }
    },
    addNewProposition(state) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        appLogger.error(`Cannot addProposition because there is no activeMap`);
        return;
      }
      const nextNewPropositionNumber = getNextNewPropositionNumber(activeMap);
      const proposition: Proposition = {
        id: uuidv4(),
        type: "Proposition",
        text: `New Proposition ${nextNewPropositionNumber}`,
        ...defaultVisibilityProps,
      };
      activeMap.entities.push(proposition);
      updateConclusions(activeMap);
    },
    addMediaExcerpt(state, action: PayloadAction<AddMediaExcerptData>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        window.alert("Please open a map to add excerpts.");
        return;
      }
      const {
        quotation,
        url,
        canonicalUrl,
        pdfFingerprint,
        sourceName,
        domAnchor,
        id,
      } = action.payload;
      const extantMediaExcerpt = activeMap.entities.find((e) =>
        isEquivalentMediaExcerpt(e, {
          url,
          canonicalUrl,
          pdfFingerprint,
          domAnchor,
        }),
      );
      if (extantMediaExcerpt) {
        appLogger.warn("Declining to create a duplicative MediaExcerpt.");
        return;
      }

      const sourceNameOverride = getSourceNameOverride(
        activeMap.sourceNameOverrides,
        {
          url,
          canonicalUrl,
          pdfFingerprint,
        },
      );
      const newNode: MediaExcerpt = {
        type: "MediaExcerpt",
        ...defaultVisibilityProps,
        id,
        quotation,
        urlInfo: { url, canonicalUrl, pdfFingerprint },
        sourceInfo: { name: sourceNameOverride ?? sourceName },
        domAnchor,
      };
      activeMap.entities.push(newNode);
    },
    updateEntity(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Entity, "type">>;
      }>,
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        appLogger.error(`Cannot updateEntity because there is no activeMap`);
        return;
      }
      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id,
      );
      if (index < 0) {
        appLogger.error(
          `Cannot updateEntity because there is no entity with id ${action.payload.id}`,
        );
        return;
      }
      activeMap.entities[index] = {
        ...activeMap.entities[index],
        ...action.payload.updates,
      };
      updateConclusions(activeMap);
    },
    updateProposition(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Proposition, "type">>;
      }>,
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;
      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id,
      );
      if (index !== -1) {
        activeMap.entities[index] = {
          ...activeMap.entities[index],
          ...action.payload.updates,
        };
      }
    },
    updateMediaExerpt(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<MediaExcerpt, "type">>;
      }>,
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;
      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id,
      );
      if (index !== -1) {
        const mediaExcerpt = activeMap.entities[
          index
        ] as unknown as MediaExcerpt;

        const updates = action.payload.updates;
        const sourceName = updates.sourceInfo?.name;
        if (sourceName) {
          const { url, canonicalUrl, pdfFingerprint } = mediaExcerpt.urlInfo;
          updateSourceNameOverrides(
            activeMap.sourceNameOverrides,
            { url, canonicalUrl, pdfFingerprint },
            sourceName,
          );
        }

        const merged = merge({}, mediaExcerpt, updates) as MediaExcerpt;
        activeMap.entities[index] = merged;
      }
    },
    updateJustification(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Justification, "type">>;
      }>,
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;

      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id,
      );
      if (index === -1) {
        appLogger.error(
          `Cannot update Justification node because no node has ID ${action.payload.id}`,
        );
        return;
      }
      activeMap.entities[index] = {
        ...activeMap.entities[index],
        ...action.payload.updates,
      };
    },
    completeDrag(state, action: PayloadAction<DragPayload>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;

      const { sourceId, targetId, polarity: actionPolarity } = action.payload;

      const source = activeMap.entities.find((n) => n.id === sourceId);
      if (!source) {
        appLogger.error(`Drag source node with id ${sourceId} not found`);
        return;
      }
      const target = activeMap.entities.find((n) => n.id === targetId);
      if (!target) {
        appLogger.error(`Drag target node with id ${targetId} not found`);
        return;
      }

      applyDragOperation(state, activeMap, source, target, actionPolarity);
      updateConclusions(activeMap);
    },
    selectEntities(state, action: PayloadAction<string[]>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        appLogger.warn("Cannot select entities because there is no active map");
        return;
      }
      const selectedEntityIds = action.payload;

      // Whenever we select a MediaExcerpt, also select its Appearances
      const appearances = activeMap.entities.filter(
        (e) =>
          e.type === "Appearance" &&
          selectedEntityIds.includes(e.mediaExcerptId),
      );
      state.selectedEntityIds = [
        ...selectedEntityIds,
        ...appearances.map((a) => a.id),
      ];
    },
    resetSelection(state) {
      state.selectedEntityIds = emptySelection;
    },
    deleteEntity(state, action: PayloadAction<string>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;

      const entityIdToDelete = action.payload;
      const entity = activeMap.entities.find((e) => e.id === entityIdToDelete);

      applyDeleteOperation(state, activeMap, entityIdToDelete);
      updateConclusions(activeMap);

      if (entity?.type === "MediaExcerpt") {
        // TODO: #3 - remove this side effect. Maybe detect the removal via useState in a component?
        void notifyTabsOfDeletedMediaExcerpt(entityIdToDelete);
      } else if (entity?.type === "Appearance") {
        updateMediaExcerptAutoVisibility(state, entity.mediaExcerptId);
      }
    },
    showEntity(state, action: PayloadAction<string>) {
      updateEntityVisibility(state, action.payload, "Visible");
    },
    hideEntity(state, action: PayloadAction<string>) {
      updateEntityVisibility(state, action.payload, "Hidden");
    },
    automateEntityVisibility(state, action: PayloadAction<string>) {
      updateEntityVisibility(state, action.payload, undefined);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncMap.pending, () => {
        // Could add loading state here if needed
      })
      .addCase(syncMap.fulfilled, () => {
        appLogger.log("Map synced successfully");
      })
      .addCase(syncMap.rejected, (state, action) => {
        appLogger.error("Failed to sync map:", action.error);
      });
  },
});

function getSourceNameOverride(
  sourceNameOverrides: Record<string, string>,
  {
    url,
    canonicalUrl,
    pdfFingerprint,
  }: {
    url: string;
    canonicalUrl: string | undefined;
    pdfFingerprint: string | undefined;
  },
) {
  return (
    (pdfFingerprint ? sourceNameOverrides[pdfFingerprint] : undefined) ??
    sourceNameOverrides[url] ??
    (canonicalUrl ? sourceNameOverrides[canonicalUrl] : undefined)
  );
}

function updateSourceNameOverrides(
  sourceNameOverrides: Record<string, string>,
  {
    url,
    canonicalUrl,
    pdfFingerprint,
  }: {
    url: string;
    canonicalUrl: string | undefined;
    pdfFingerprint: string | undefined;
  },
  sourceName: string,
) {
  if (canonicalUrl) {
    sourceNameOverrides[canonicalUrl] = sourceName;
  }
  if (pdfFingerprint) {
    sourceNameOverrides[pdfFingerprint] = sourceName;
  }
  sourceNameOverrides[url] = sourceName;
}

export function updateConclusions(map: ArgumentMap) {
  const {
    propositionIds,
    justificationBasisIds,
    justificationTargetIds,
    mediaExcerptsById,
    propositionCompoundAtomIds,
  } = map.entities.reduce(
    (acc, entity) => {
      if (entity.type === "Justification") {
        acc.justificationBasisIds.add(entity.basisId);
        if (!acc.justificationBasisIds.has(entity.targetId)) {
          acc.justificationTargetIds.add(entity.targetId);
        }
      } else if (entity.type === "Proposition") {
        acc.propositionIds.add(entity.id);
      } else if (entity.type === "MediaExcerpt") {
        acc.mediaExcerptsById.set(entity.id, entity);
      } else if (entity.type === "PropositionCompound") {
        entity.atomIds.forEach((id) => acc.propositionCompoundAtomIds.add(id));
      }
      return acc;
    },
    {
      propositionIds: new Set<string>(),
      justificationBasisIds: new Set<string>(),
      justificationTargetIds: new Set<string>(),
      mediaExcerptsById: new Map<string, MediaExcerpt>(),
      propositionCompoundAtomIds: new Set<string>(),
    },
  );

  const { sourceNamesByPropositionId, urlsByPropositionId } =
    map.entities.reduce(
      (acc, entity) => {
        if (entity.type === "Appearance") {
          const mediaExcerpt = mediaExcerptsById.get(entity.mediaExcerptId);
          if (mediaExcerpt) {
            if (!acc.sourceNamesByPropositionId.has(entity.apparitionId)) {
              acc.sourceNamesByPropositionId.set(
                entity.apparitionId,
                new Set(),
              );
            }
            acc.sourceNamesByPropositionId
              .get(entity.apparitionId)!
              .add(mediaExcerpt.sourceInfo.name);

            if (!acc.urlsByPropositionId.has(entity.apparitionId)) {
              acc.urlsByPropositionId.set(entity.apparitionId, new Set());
            }
            acc.urlsByPropositionId
              .get(entity.apparitionId)!
              .add(preferredUrl(mediaExcerpt.urlInfo));
          } else {
            appLogger.warn(
              `MediaExcerpt not found for Appearance: ${entity.id}`,
            );
          }
        }
        return acc;
      },
      {
        sourceNamesByPropositionId: new Map<string, Set<string>>(),
        urlsByPropositionId: new Map<string, Set<string>>(),
      },
    );

  // Conclusions must be propositions that are not the basis of any justification.
  // Because PropositionCompounds only exist to be justification bases, we exclude
  // any proposition that is an atom.
  const conclusionPropositionIds = [...justificationTargetIds].filter(
    (id) =>
      propositionIds.has(id) &&
      !justificationBasisIds.has(id) &&
      !propositionCompoundAtomIds.has(id),
  );

  // Group conclusions by their source names and URLs
  const { conclusionGroups } = conclusionPropositionIds.reduce(
    (acc, id) => {
      const sourceNames = Array.from(sourceNamesByPropositionId.get(id) || []);
      const urls = Array.from(urlsByPropositionId.get(id) || []);
      const key = JSON.stringify({ sourceNames, urls });

      if (!acc.conclusionGroups.has(key)) {
        acc.conclusionGroups.set(key, {
          propositionIds: [],
          sourceNames,
          urls,
        });
      }
      acc.conclusionGroups.get(key)!.propositionIds.push(id);
      return acc;
    },
    { conclusionGroups: new Map<string, ConclusionInfo>() },
  );

  map.conclusions = Array.from(conclusionGroups.values());
}

export function preferredUrl(urlInfo: UrlInfo): string {
  return urlInfo.canonicalUrl ?? urlInfo.url;
}

function applyDeleteOperation(
  state: State,
  activeMap: ArgumentMap,
  entityIdToDelete: string,
) {
  const entitiesById = new Map(
    activeMap.entities.map((entity) => [entity.id, entity]),
  );
  const allEntityIdsToDelete = new Set([entityIdToDelete]);
  activeMap.entities.forEach((entity) => {
    // Process PropositionCompounds first since they may delete justifications
    if (entity.type === "PropositionCompound") {
      updatePropositionCompound(entity, entityIdToDelete, allEntityIdsToDelete);
    }
    // Delete justifications if either their basis or target will be deleted.
    if (
      entity.type === "Justification" &&
      (allEntityIdsToDelete.has(entity.basisId) ||
        allEntityIdsToDelete.has(entity.targetId))
    ) {
      allEntityIdsToDelete.add(entity.id);
      const basis = entitiesById.get(entity.basisId);
      // The point of PropositionCompounds is to wrap propositions in a justification.
      // So if the justification is going away, we should delete the PropositionCompound too.
      if (basis && basis.type === "PropositionCompound") {
        // If no other justifications are using the proposition compound, delete it
        const otherJustificationsUsingCompound = activeMap.entities.some(
          (e) =>
            e.type === "Justification" &&
            e.basisId === basis.id &&
            !allEntityIdsToDelete.has(e.id),
        );
        if (!otherJustificationsUsingCompound) {
          allEntityIdsToDelete.add(basis.id);
        }
      }
    }
  });

  // Remove all the collected entities
  activeMap.entities = activeMap.entities.filter(
    (entity) => !allEntityIdsToDelete.has(entity.id),
  );

  state.selectedEntityIds = state.selectedEntityIds.filter(
    (id) => !allEntityIdsToDelete.has(id),
  );

  activeMap.entities = activeMap.entities.filter((entity) => {
    switch (entity.type) {
      case "PropositionCompound": {
        // delete proposition compounds if their last justification was deleted.
        const hasJustification = activeMap.entities.some(
          (e) => e.type === "Justification" && e.basisId === entity.id,
        );
        return hasJustification;
      }
      case "Appearance": {
        // Delete appearances for deleted dependencies
        return (
          !allEntityIdsToDelete.has(entity.mediaExcerptId) &&
          !allEntityIdsToDelete.has(entity.apparitionId)
        );
      }
      default:
        return true;
    }
  });

  // This must come after updating the activeMap.entities.
  updateMediaExcerptAutoVisibilityForDeletedJustifications(
    state,
    entitiesById,
    allEntityIdsToDelete,
  );
}

function applyDragOperation(
  state: State,
  activeMap: ArgumentMap,
  source: Entity,
  target: Entity,
  actionPolarity: Polarity | undefined,
) {
  let basisId: string;
  switch (source.type) {
    case "Proposition": {
      switch (target.type) {
        case "PropositionCompound": {
          if (!target.atomIds.includes(source.id)) {
            target.atomIds.push(source.id);
          } else {
            appLogger.log(
              `Proposition ID ${source.id} is already an atom of proposition compound ID ${target.id}. Skipping add it.`,
            );
          }
          return;
        }
        case "Justification":
        case "Proposition": {
          let propositionCompound = activeMap.entities.find(
            (e) =>
              e.type === "PropositionCompound" &&
              e.atomIds.length === 1 &&
              e.atomIds[0] === source.id,
          );
          if (!propositionCompound) {
            propositionCompound = {
              type: "PropositionCompound" as const,
              id: uuidv4(),
              atomIds: [source.id],
              ...defaultVisibilityProps,
            };
            activeMap.entities.push(propositionCompound);
          }
          basisId = propositionCompound.id;
          break;
        }
        case "MediaExcerpt": {
          const apparitionId = source.id;
          const mediaExcerptId = target.id;
          const extantAppearance = activeMap.entities.find(
            (e) =>
              e.type === "Appearance" &&
              e.apparitionId === apparitionId &&
              e.mediaExcerptId === mediaExcerptId,
          );
          if (!extantAppearance) {
            activeMap.entities.push({
              type: "Appearance" as const,
              id: uuidv4(),
              apparitionId,
              mediaExcerptId,
              ...defaultVisibilityProps,
            });
            updateMediaExcerptAutoVisibility(state, mediaExcerptId);
          } else {
            appLogger.log(
              `Appearance between apparition ID ${apparitionId} and media excerpt ID ${mediaExcerptId} already exists. Skipping creation.`,
            );
          }
          return;
        }
        default: {
          appLogger.error(
            `Invalid target type ${target.type} for source type ${source.type}`,
          );
          return;
        }
      }
      break;
    }
    case "MediaExcerpt": {
      switch (target.type) {
        case "MediaExcerpt":
        case "PropositionCompound":
          appLogger.error(
            `Invalid target type ${target.type} for source type ${source.type}`,
          );
          return;
        default:
          break;
      }
      basisId = source.id;
      break;
    }
    default:
      appLogger.error(`Invalid drag source type type: ${source.type}`);
      return;
  }

  const extantJustification = activeMap.entities.find(
    (e) =>
      e.type === "Justification" &&
      e.targetId === target.id &&
      e.basisId === basisId,
  );
  if (extantJustification) {
    appLogger.info("Extant justification found, not creating a new one.");
    return;
  }

  const newJustificationId = uuidv4();
  const polarity =
    // Counter justifications must be negative
    target.type === "Justification"
      ? "Negative"
      : (actionPolarity ?? "Positive");
  const newJustification: Justification = {
    id: newJustificationId,
    type: "Justification",
    targetId: target.id,
    basisId,
    polarity,
    ...defaultVisibilityProps,
  };
  activeMap.entities.push(newJustification);
}

function updateMediaExcerptAutoVisibilityForDeletedJustifications(
  state: State,
  entitiesById: Map<string, Entity>,
  allEntityIdsToDelete: Set<string>,
) {
  const deletedJustificationMediaExcerptBasisIds: string[] = [];
  allEntityIdsToDelete.forEach((id) => {
    const entity = entitiesById.get(id);
    if (entity?.type === "Justification") {
      const basis = entitiesById.get(entity.basisId);
      if (basis?.type === "MediaExcerpt") {
        deletedJustificationMediaExcerptBasisIds.push(basis.id);
      }
    }
  });
  deletedJustificationMediaExcerptBasisIds.forEach((id) =>
    updateMediaExcerptAutoVisibility(state, id),
  );
}

function updateEntityVisibility(
  state: State,
  entityId: string,
  visibility: Visibility | undefined,
) {
  const activeMap = state.maps.find((map) => map.id === state.activeMapId);
  if (!activeMap) {
    appLogger.error(
      `Unable to update entity visibility because the active map ${state.activeMapId} was not found.`,
    );
    return;
  }
  const entity = activeMap.entities.find((entity) => entity.id === entityId);
  if (!entity) {
    appLogger.error(
      `Unable to update entity visibility because the entity with ID ${state.activeMapId} was not found.`,
    );
    return;
  }
  entity.explicitVisibility = visibility;
}

function updatePropositionCompound(
  entity: PropositionCompound,
  entityIdToDelete: string,
  allEntityIdsToDelete: Set<string>,
) {
  entity.atomIds = entity.atomIds.filter((id) => id !== entityIdToDelete);
  if (entity.atomIds.length === 0) {
    allEntityIdsToDelete.add(entity.id);
  }
}

function updateMediaExcerptAutoVisibility(
  state: State,
  mediaExcerptId: string,
) {
  const activeMap = state.maps.find((map) => map.id === state.activeMapId);
  if (!activeMap) return;

  // If a MediaExcerpt is only used in appearances, hide it.
  // If a MediaExcerpt is unused or used in Justifications, show it.
  let autoVisibility: Visibility = "Visible";
  for (const entity of activeMap.entities) {
    if (entity.type === "Justification" && entity.basisId === mediaExcerptId) {
      autoVisibility = "Visible";
      break;
    }
    if (
      entity.type === "Appearance" &&
      entity.mediaExcerptId === mediaExcerptId
    ) {
      autoVisibility = "Hidden";
    }
  }
  const mediaExcerpt = activeMap.entities.find(
    (entity) => entity.id === mediaExcerptId,
  );
  if (!mediaExcerpt) {
    appLogger.error(
      `Unable to update MediaExcerpt visibility because MediaExcerpt with ID ${mediaExcerptId} was missing`,
    );
    return;
  }
  mediaExcerpt.autoVisibility = autoVisibility;
}

function getNextNewPropositionNumber(map: ArgumentMap) {
  return map.entities.reduce((maxNum, entity) => {
    if (entity.type !== "Proposition") {
      return maxNum;
    }
    const match = entity.text.match(/New Proposition (\d+)/);
    const groupVal = match?.groups?.[0];
    if (!groupVal) {
      return maxNum;
    }
    const groupInt = parseInt(groupVal, 10);
    if (isNaN(groupInt)) {
      return maxNum;
    }
    return Math.max(maxNum, groupInt);
  }, 1);
}

export function isEquivalentMediaExcerpt(
  e: Entity,
  {
    url,
    canonicalUrl,
    pdfFingerprint,
    domAnchor,
  }: {
    url: string;
    canonicalUrl: string | undefined;
    pdfFingerprint: string | undefined;
    domAnchor: DomAnchor;
  },
) {
  return (
    e.type === "MediaExcerpt" &&
    isEquivalentUrlInfo(e.urlInfo, { url, canonicalUrl, pdfFingerprint }) &&
    deepEqual(e.domAnchor, domAnchor)
  );
}

/** Whether the two UrlInfos are equivalent and represent the exact same source. */
export function isEquivalentUrlInfo(urlInfo1: UrlInfo, urlInfo2: UrlInfo) {
  return (
    urlInfo1.url === urlInfo2.url &&
    urlInfo1.canonicalUrl === urlInfo2.canonicalUrl &&
    urlInfo1.pdfFingerprint === urlInfo2.pdfFingerprint
  );
}

/** Whether the MediaExcerpt should be displayed on the page with the given UrlInfo. */
export function isMatchingUrlInfo(
  mediaExcerptUrlInfo: UrlInfo,
  pageUrlInfo: UrlInfo,
) {
  if (mediaExcerptUrlInfo.pdfFingerprint) {
    return mediaExcerptUrlInfo.pdfFingerprint === pageUrlInfo.pdfFingerprint;
  }
  if (mediaExcerptUrlInfo.canonicalUrl) {
    return mediaExcerptUrlInfo.canonicalUrl === pageUrlInfo.canonicalUrl;
  }
  return mediaExcerptUrlInfo.url === pageUrlInfo.url;
}

export const {
  addMediaExcerpt,
  addNewProposition,
  automateEntityVisibility,
  completeDrag,
  createMap,
  deleteEntity,
  deleteMap,
  hideEntity,
  renameActiveMap,
  resetSelection,
  selectEntities,
  setActiveMap,
  showEntity,
  updateEntity,
  updateJustification,
  updateMediaExerpt,
  updateProposition,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;
