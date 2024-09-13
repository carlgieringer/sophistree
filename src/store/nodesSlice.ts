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

type Polarity = "Positive" | "Negative";

interface JustificationNode extends BaseNode {
  type: "Justification";
  basisId: string;
  targetId: string;
  polarity: Polarity;
}

export interface MediaExcerptNode extends BaseNode, AddMediaExcerptData {
  type: "MediaExcerpt";
}

interface Edge {
  source: string;
  target: string;
  polarity: Polarity;
}

interface DragPayload {
  sourceId: string;
  targetId: string;
  // Since a target may appear in multiple places, include its parent for context
  targetParentId: string | undefined;
  polarity?: Polarity;
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
      const { sourceId, targetId, polarity: actionPolarity } = action.payload;

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
            case "PropositionCompound": {
              target.atomIds.push(sourceId);
              return;
            }
            case "Justification":
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
      const polarity =
        // Counter justifications must be negative
        target.type === "Justification"
          ? "Negative"
          : actionPolarity ?? "Positive";
      const newJustification: JustificationNode = {
        id: newJustificationId,
        type: "Justification",
        content: "",
        targetId,
        basisId,
        polarity,
      };
      state.nodes.push(newJustification);
      state.edges.push({
        source: newJustificationId,
        target: targetId,
        polarity,
      });
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
      const nodeIdToDelete = action.payload;
      const nodesById = new Map(state.nodes.map((node) => [node.id, node]));
      const nodeIdsToDelete = new Set([nodeIdToDelete]);
      state.nodes.forEach((node) => {
        // Process PropositionCompounds first since they may delete justifications
        if (node.type === "PropositionCompound") {
          updatePropositionCompound(node, nodeIdToDelete, nodeIdsToDelete);
        }
        if (
          node.type === "Justification" &&
          (nodeIdsToDelete.has(node.basisId) ||
            nodeIdsToDelete.has(node.targetId))
        ) {
          nodeIdsToDelete.add(node.id);
          const basis = nodesById.get(node.basisId);
          if (basis && basis.type === "PropositionCompound") {
            nodeIdsToDelete.add(basis.id);
          }
        }
      });

      state.nodes = state.nodes.filter((node) => !nodeIdsToDelete.has(node.id));
      state.edges = state.edges.filter(
        (edge) =>
          !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
      );

      if (state.selectedNodeId && nodeIdsToDelete.has(state.selectedNodeId)) {
        state.selectedNodeId = undefined;
      }
    },
  },
});

function updatePropositionCompound(
  node: PropositionCompoundNode,
  nodeIdToDelete: string,
  nodeIdsToDelete: Set<string>
) {
  node.atomIds = node.atomIds.filter((id) => id !== nodeIdToDelete);
  if (node.atomIds.length === 0) {
    nodeIdsToDelete.add(node.id);
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
