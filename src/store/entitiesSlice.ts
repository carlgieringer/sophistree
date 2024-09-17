import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import * as domAnchorTextQuote from "dom-anchor-text-quote";
import { DomAnchor } from "../anchors";

interface BaseEntity {
  id: string;
}

export type Entity =
  | Proposition
  | PropositionCompound
  | Justification
  | MediaExcerpt;

export interface Proposition extends BaseEntity {
  type: "Proposition";
  text: string;
}

interface PropositionCompound extends BaseEntity {
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

interface DragPayload {
  sourceId: string;
  targetId: string;
  // Since a target may appear in multiple places, include its parent for context
  targetParentId: string | undefined;
  polarity?: Polarity;
}

const initialState = {
  entities: [] as Entity[],
  selectedEntityId: undefined as string | undefined,
};

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
    addEntity(state, action: PayloadAction<Entity>) {
      state.entities.push(action.payload);
    },
    addMediaExcerpt(state, action: PayloadAction<AddMediaExcerptData>) {
      const newNode: MediaExcerpt = {
        type: "MediaExcerpt",
        ...action.payload,
      };
      state.entities.push(newNode);
    },
    updateEntity(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Entity, "type">>;
      }>
    ) {
      const index = state.entities.findIndex(
        (entity) => entity.id === action.payload.id
      );
      if (index !== -1) {
        state.entities[index] = {
          ...state.entities[index],
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
      const index = state.entities.findIndex(
        (entity) => entity.id === action.payload.id
      );
      if (index !== -1) {
        state.entities[index] = {
          ...state.entities[index],
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
      const index = state.entities.findIndex(
        (entity) => entity.id === action.payload.id
      );
      if (index === -1) {
        console.error(
          `Cannot update Justification node because no node has ID ${action.payload.id}`
        );
        return;
      }
      state.entities[index] = {
        ...state.entities[index],
        ...action.payload.updates,
      };
    },
    completeDrag(state, action: PayloadAction<DragPayload>) {
      const { sourceId, targetId, polarity: actionPolarity } = action.payload;

      const source = state.entities.find((n) => n.id === sourceId);
      if (!source) {
        console.error(`Drag source node with id ${sourceId} not found`);
        return;
      }
      const target = state.entities.find((n) => n.id === targetId);
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
              const propositionCompound = {
                type: "PropositionCompound" as const,
                id: uuidv4(),
                atomIds: [sourceId],
              };
              state.entities.push(propositionCompound);
              basisId = propositionCompound.id;
              break;
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
      };
      state.entities.push(newJustification);
    },
    selectEntity(state, action: PayloadAction<string>) {
      state.selectedEntityId = action.payload;
    },
    resetSelection(state) {
      state.selectedEntityId = undefined;
    },
    deleteEntity(state, action: PayloadAction<string>) {
      const entityIdToDelete = action.payload;
      const entitiesById = new Map(
        state.entities.map((entity) => [entity.id, entity])
      );
      const entityIdsToDelete = new Set([entityIdToDelete]);
      state.entities.forEach((entity) => {
        // Process PropositionCompounds first since they may delete justifications
        if (entity.type === "PropositionCompound") {
          updatePropositionCompound(
            entity,
            entityIdToDelete,
            entityIdsToDelete
          );
        }
        if (
          entity.type === "Justification" &&
          (entityIdsToDelete.has(entity.basisId) ||
            entityIdsToDelete.has(entity.targetId))
        ) {
          entityIdsToDelete.add(entity.id);
          const basis = entitiesById.get(entity.basisId);
          if (basis && basis.type === "PropositionCompound") {
            entityIdsToDelete.add(basis.id);
          }
        }
      });

      state.entities = state.entities.filter(
        (entity) => !entityIdsToDelete.has(entity.id)
      );

      if (
        state.selectedEntityId &&
        entityIdsToDelete.has(state.selectedEntityId)
      ) {
        state.selectedEntityId = undefined;
      }
    },
  },
});

function updatePropositionCompound(
  entity: PropositionCompound,
  entityIdToDelete: string,
  entityIdsToDelete: Set<string>
) {
  entity.atomIds = entity.atomIds.filter((id) => id !== entityIdToDelete);
  if (entity.atomIds.length === 0) {
    entityIdsToDelete.add(entity.id);
  }
}

export const {
  addEntity,
  addMediaExcerpt,
  updateEntity,
  updateProposition,
  updateJustification,
  deleteEntity,
  completeDrag,
  resetSelection,
  selectEntity,
} = entitiesSlice.actions;

export default entitiesSlice.reducer;
