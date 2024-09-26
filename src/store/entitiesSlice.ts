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

export interface MediaExcerpt extends BaseEntity, AddMediaExcerptData {
  type: "MediaExcerpt";
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

export interface ArgumentMap {
  id: string;
  name: string;
  entities: Entity[];
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
      if (activeMap) {
        activeMap.entities.push(action.payload);
      }
    },
    addMediaExcerpt(state, action: PayloadAction<AddMediaExcerptData>) {
      const activeMap = state.maps.find((map) => map.id === state.activeMapId);
      if (activeMap) {
        const newNode: MediaExcerpt = {
          type: "MediaExcerpt",
          ...defaultVisibilityProps,
          ...action.payload,
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

      let basisId: string;
      switch (source.type) {
        case "Proposition": {
          switch (target.type) {
            case "PropositionCompound": {
              target.atomIds.push(sourceId);
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
                  atomIds: [sourceId],
                  ...defaultVisibilityProps,
                };
                activeMap.entities.push(propositionCompound);
              }
              basisId = propositionCompound.id;
              break;
            }
            case "MediaExcerpt": {
              const apparitionId = sourceId;
              const mediaExcerptId = targetId;
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
          basisId = sourceId;
          break;
        }
        default:
          console.error(`Invalid drag source type type: ${source.type}`);
          return;
      }

      const newJustificationId = uuidv4();
      const polarity =
        // Counter justifications must be negative
        target.type === "Justification"
          ? "Negative"
          : actionPolarity ?? "Positive";
      const newJustification: Justification = {
        id: newJustificationId,
        type: "Justification",
        targetId,
        basisId,
        polarity,
        ...defaultVisibilityProps,
      };
      activeMap.entities.push(newJustification);
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
      const entitiesById = new Map(
        activeMap.entities.map((entity) => [entity.id, entity])
      );
      const allEntityIdsToDelete = new Set([entityIdToDelete]);
      activeMap.entities.forEach((entity) => {
        // Process PropositionCompounds first since they may delete justifications
        if (entity.type === "PropositionCompound") {
          updatePropositionCompound(
            entity,
            entityIdToDelete,
            allEntityIdsToDelete
          );
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

      // This must come after updating the activeMap.entities.
      updateMediaExcerptAutoVisibilityForDeletedJustifications(
        state,
        entitiesById,
        allEntityIdsToDelete
      );
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

function isMediaExcerptUsed(entity: Entity, mediaExcerptId: string) {}

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
