import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

import { DomAnchor } from "../anchors";

interface BaseEntity {
  id: string;
  // if explicitVisibility is missing, falls back to autoVisibility
  explicitVisibility?: Visibility | undefined;
  autoVisibility: Visibility;
}

type Visibility = "Visible" | "Hidden";

export const defaultVisibilityProps = { autoVisibility: "Visible" as const };

export type Entity =
  | Proposition
  | PropositionCompound
  | Justification
  | MediaExcerpt
  | Appearance;

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

export interface MediaExcerpt extends BaseEntity {
  type: "MediaExcerpt";
  quotation: string;
  urlInfo: UrlInfo;
  sourceInfo: SourceInfo;
  domAnchor: DomAnchor;
}

interface UrlInfo {
  url: string;
  canonicalUrl?: string;
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
  conclusions: ConclusionInfo[];
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
  sourceName: string;
  domAnchor: DomAnchor;
}

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
    addEntity(state, action: PayloadAction<Entity>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        console.error(`Cannot addEntity because there is no activeMap`);
        return;
      }
      activeMap.entities.push(action.payload);
      updateConclusions(activeMap);
    },
    addMediaExcerpt(state, action: PayloadAction<AddMediaExcerptData>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (activeMap) {
        const { quotation, url, canonicalUrl, sourceName, domAnchor, id } =
          action.payload;
        const newNode: MediaExcerpt = {
          type: "MediaExcerpt",
          ...defaultVisibilityProps,
          id,
          quotation,
          urlInfo: { url, canonicalUrl },
          sourceInfo: { name: sourceName },
          domAnchor,
        };
        activeMap.entities.push(newNode);
      }
    },
    updateEntity(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Entity, "type">>;
      }>
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        console.error(`Cannot updateEntity because there is no activeMap`);
        return;
      }
      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id
      );
      if (index < 1) {
        console.error(
          `Cannot updateEntity because there is no entity with id ${action.payload.id}`
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
      }>
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;
      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id
      );
      if (index !== -1) {
        activeMap.entities[index] = {
          ...activeMap.entities[index],
          ...action.payload.updates,
        };
      }
    },
    updateJustification(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Justification, "type">>;
      }>
    ) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) return;

      const index = activeMap.entities.findIndex(
        (entity) => entity.id === action.payload.id
      );
      if (index === -1) {
        console.error(
          `Cannot update Justification node because no node has ID ${action.payload.id}`
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
        console.error(`Drag source node with id ${sourceId} not found`);
        return;
      }
      const target = activeMap.entities.find((n) => n.id === targetId);
      if (!target) {
        console.error(`Drag target node with id ${targetId} not found`);
        return;
      }

      applyDragOperation(state, activeMap, source, target, actionPolarity);
      updateConclusions(activeMap);
    },
    selectEntities(state, action: PayloadAction<string[]>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (!activeMap) {
        console.warn("Cannot select entities because there is no active map");
        return;
      }
      const selectedEntityIds = action.payload;

      // Whenever we select a MediaExcerpt, also select its Appearances
      const appearances = activeMap.entities.filter(
        (e) =>
          e.type === "Appearance" &&
          selectedEntityIds.includes(e.mediaExcerptId)
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

      applyDeleteOperation(state, activeMap, entityIdToDelete);
      updateConclusions(activeMap);
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
});

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
    }
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
                new Set()
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
            console.warn(`MediaExcerpt not found for Appearance: ${entity.id}`);
          }
        }
        return acc;
      },
      {
        sourceNamesByPropositionId: new Map<string, Set<string>>(),
        urlsByPropositionId: new Map<string, Set<string>>(),
      }
    );

  // Conclusions must be propositions that are not the basis of any justification.
  // Because PropositionCompounds only exist to be justification bases, we exclude
  // any proposition that is an atom.
  const conclusionPropositionIds = [...justificationTargetIds].filter(
    (id) =>
      propositionIds.has(id) &&
      !justificationBasisIds.has(id) &&
      !propositionCompoundAtomIds.has(id)
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
    { conclusionGroups: new Map<string, ConclusionInfo>() }
  );

  map.conclusions = Array.from(conclusionGroups.values());
}

export function preferredUrl(urlInfo: UrlInfo): string {
  return urlInfo.canonicalUrl ?? urlInfo.url;
}

function applyDeleteOperation(
  state: State,
  activeMap: ArgumentMap,
  entityIdToDelete: string
) {
  const entitiesById = new Map(
    activeMap.entities.map((entity) => [entity.id, entity])
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
            !allEntityIdsToDelete.has(e.id)
        );
        if (!otherJustificationsUsingCompound) {
          allEntityIdsToDelete.add(basis.id);
        }
      }
    }
  });

  // Remove all the collected entities
  activeMap.entities = activeMap.entities.filter(
    (entity) => !allEntityIdsToDelete.has(entity.id)
  );

  state.selectedEntityIds = state.selectedEntityIds.filter(
    (id) => !allEntityIdsToDelete.has(id)
  );

  activeMap.entities = activeMap.entities.filter((entity) => {
    switch (entity.type) {
      case "PropositionCompound": {
        // delete proposition compounds if their last justification was deleted.
        const hasJustification = activeMap.entities.some(
          (e) => e.type === "Justification" && e.basisId === entity.id
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
    allEntityIdsToDelete
  );
}

function applyDragOperation(
  state: State,
  activeMap: ArgumentMap,
  source: Entity,
  target: Entity,
  actionPolarity: Polarity | undefined
) {
  let basisId: string;
  switch (source.type) {
    case "Proposition": {
      switch (target.type) {
        case "PropositionCompound": {
          if (!target.atomIds.includes(source.id)) {
            target.atomIds.push(source.id);
          } else {
            console.log(
              `Proposition ID ${source.id} is already an atom of proposition compound ID ${target.id}. Skipping add it.`
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
              e.atomIds[0] === source.id
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
              e.mediaExcerptId === mediaExcerptId
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
            console.log(
              `Appearance between apparition ID ${apparitionId} and media excerpt ID ${mediaExcerptId} already exists. Skipping creation.`
            );
          }
          return;
        }
        default: {
          console.error(
            `Invalid target type ${target.type} for source type ${source.type}`
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
          console.error(
            `Invalid target type ${target.type} for source type ${source.type}`
          );
          return;
      }
      basisId = source.id;
      break;
    }
    default:
      console.error(`Invalid drag source type type: ${source.type}`);
      return;
  }

  const extantJustification = activeMap.entities.find(
    (e) =>
      e.type === "Justification" &&
      e.targetId === target.id &&
      e.basisId === basisId
  );
  if (extantJustification) {
    console.info("Extant justification found, not creating a new one.");
    return;
  }

  const newJustificationId = uuidv4();
  const polarity =
    // Counter justifications must be negative
    target.type === "Justification" ? "Negative" : actionPolarity ?? "Positive";
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
  allEntityIdsToDelete: Set<string>
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
    updateMediaExcerptAutoVisibility(state, id)
  );
}

function updateEntityVisibility(
  state: State,
  entityId: string,
  visibility: Visibility | undefined
) {
  const activeMap = state.maps.find((map) => map.id === state.activeMapId);
  if (!activeMap) {
    console.error(
      `Unable to update entity visibility because the active map ${state.activeMapId} was not found.`
    );
    return;
  }
  const entity = activeMap.entities.find((entity) => entity.id === entityId);
  if (!entity) {
    console.error(
      `Unable to update entity visibility because the entity with ID ${state.activeMapId} was not found.`
    );
    return;
  }
  entity.explicitVisibility = visibility;
}

function updatePropositionCompound(
  entity: PropositionCompound,
  entityIdToDelete: string,
  allEntityIdsToDelete: Set<string>
) {
  entity.atomIds = entity.atomIds.filter((id) => id !== entityIdToDelete);
  if (entity.atomIds.length === 0) {
    allEntityIdsToDelete.add(entity.id);
  }
}

function updateMediaExcerptAutoVisibility(
  state: State,
  mediaExcerptId: string
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
    (entity) => entity.id === mediaExcerptId
  );
  if (!mediaExcerpt) {
    console.error(
      `Unable to update MediaExcerpt visibility because MediaExcerpt with ID ${mediaExcerptId} was missing`
    );
    return;
  }
  mediaExcerpt.autoVisibility = autoVisibility;
}

export const {
  createMap,
  deleteMap,
  setActiveMap,
  addEntity,
  addMediaExcerpt,
  updateEntity,
  updateProposition,
  updateJustification,
  deleteEntity,
  completeDrag,
  resetSelection,
  selectEntities,
  renameActiveMap,
  showEntity,
  hideEntity,
  automateEntityVisibility,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;
