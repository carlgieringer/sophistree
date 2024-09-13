import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import * as domAnchorTextQuote from "dom-anchor-text-quote";
import { DomAnchor } from "../anchors";

interface BaseNode {
  id: string;
  // PropositionCompounds and Justifications don't need content?
  content?: string;
}

export type Node =
  | PropositionNode
  | PropositionCompoundNode
  | JustificationNode
  | MediaExcerptNode;

interface PropositionNode extends BaseNode {
  type: "Proposition";
}

interface PropositionCompoundNode extends BaseNode {
  type: "PropositionCompound";
  atomIds: string[];
}

interface JustificationNode extends BaseNode {
  type: "Justification";
  basisId: string;
  targetId: string;
}

export interface MediaExcerptNode extends BaseNode, AddMediaExcerptData {
  type: "MediaExcerpt";
}

interface Edge {
  source: string;
  target: string;
}

interface DragPayload {
  sourceId: string;
  targetId: string;
  // Since a target may appear in multiple places, include its parent for context
  targetParentId: string | undefined;
}

const initialState = {
  nodes: [] as Node[],
  edges: [] as Edge[],
  selectedNodeId: undefined as string | undefined,
};

type NodesState = typeof initialState;

export interface AddMediaExcerptData {
  id: string;
  quotation: string;
  url: string;
  canonicalUrl?: string;
  sourceName: string;
  domAnchor: DomAnchor;
}

export const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: {
    addNode(state, action: PayloadAction<Node>) {
      state.nodes.push(action.payload);
    },
    addMediaExcerpt(state, action: PayloadAction<AddMediaExcerptData>) {
      const newNode: MediaExcerptNode = {
        type: "MediaExcerpt",
        content: action.payload.quotation,
        ...action.payload,
      };
      state.nodes.push(newNode);
    },
    updateNode(
      state,
      action: PayloadAction<{
        id: string;
        updates: Partial<Omit<Node, "type">>;
      }>
    ) {
      const index = state.nodes.findIndex(
        (node) => node.id === action.payload.id
      );
      if (index !== -1) {
        state.nodes[index] = {
          ...state.nodes[index],
          ...action.payload.updates,
        };
      }
    },
    completeDrag(state, action: PayloadAction<DragPayload>) {
      const { sourceId, targetId } = action.payload;

      const source = state.nodes.find((n) => n.id === sourceId);
      if (!source) {
        console.error(`Drag source node with id ${sourceId} not found`);
        return;
      }
      const target = state.nodes.find((n) => n.id === targetId);
      if (!target) {
        console.error(`Drag target node with id ${targetId} not found`);
        return;
      }

      let basisId: string;
      switch (source.type) {
        case "Proposition": {
          switch (target.type) {
            case "Justification": {
              addPropositionToJustification(state, source, target);
              return;
            }
            case "PropositionCompound": {
              target.atomIds.push(sourceId);
              return;
            }
            case "Proposition": {
              const propositionCompound = {
                type: "PropositionCompound" as const,
                id: uuidv4(),
                content: "",
                atomIds: [sourceId],
              };
              state.nodes.push(propositionCompound);
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
      const newJustification: JustificationNode = {
        id: newJustificationId,
        type: "Justification",
        content: "",
        targetId,
        basisId,
      };
      state.nodes.push(newJustification);
      state.edges.push({ source: newJustificationId, target: targetId });
    },
    removeEdge(state, action: PayloadAction<Edge>) {
      state.edges = state.edges.filter(
        (edge) =>
          !(
            edge.source === action.payload.source &&
            edge.target === action.payload.target
          )
      );
    },
    selectNode(state, action: PayloadAction<string>) {
      state.selectedNodeId = action.payload;
    },
    resetSelection(state) {
      state.selectedNodeId = undefined;
    },
    deleteNode(state, action: PayloadAction<string>) {
      state.nodes = state.nodes.filter((node) => node.id !== action.payload);
      state.edges = state.edges.filter(
        (edge) =>
          edge.source !== action.payload && edge.target !== action.payload
      );
      if ((state.selectedNodeId = action.payload)) {
        state.selectedNodeId = undefined;
      }
    },
  },
});

function addPropositionToJustification(
  state: NodesState,
  source: PropositionNode,
  target: JustificationNode
) {
  const basis = state.nodes.find((n) => n.id === target.basisId);
  if (!basis) {
    console.error(
      `Could not find basis node having id ${target.basisId} for justification having node ID ${target.id}`
    );
    return;
  }
  switch (basis.type) {
    case "MediaExcerpt": {
      console.error(
        "Cannot add a roposition to a media excerpt-based Justification."
      );
      break;
    }
    case "PropositionCompound": {
      basis.atomIds.push(source.id);
      break;
    }
    default:
      console.error(
        `Invalid Justification basis type ${basis.type} for justification ID ${target.id}`
      );
      break;
  }
}

export const {
  addNode,
  addMediaExcerpt,
  updateNode,
  deleteNode,
  completeDrag,
  removeEdge,
  resetSelection,
  selectNode,
} = nodesSlice.actions;

export default nodesSlice.reducer;
