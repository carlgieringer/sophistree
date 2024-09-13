import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

interface BaseNode {
  id: string;
  content: string;
  selected?: boolean;
}

type Node = PropositionNode | JustificationNode | MediaExcerptNode;

interface PropositionNode extends BaseNode {
  type: "Proposition";
}

interface JustificationNode extends BaseNode {
  type: "Justification";
  basis: string;
  target: string;
}

interface MediaExcerptNode extends BaseNode {
  type: "MediaExcerpt";
  quotation: string;
  url: string;
  sourceName: string;
}

interface Edge {
  source: string;
  target: string;
}

const initialState = {
  nodes: [] as Node[],
  edges: [] as Edge[],
  selectedNodeId: undefined as string | undefined,
};

export interface AddMediaExcerptData {
  id: string;
  quotation: string;
  url: string;
  sourceName: string;
}

export const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: {
    addNode(state, action: PayloadAction<Node>) {
      state.nodes.push(action.payload);
    },
    addMediaExcerpt(
      state,
      action: PayloadAction<Omit<AddMediaExcerptData, "id">>
    ) {
      const newNode: MediaExcerptNode = {
        id: uuidv4(),
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
    addEdge(state, action: PayloadAction<Edge>) {
      state.edges.push(action.payload);
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
      const node = state.nodes.find((node) => node.id === action.payload);
      if (node) {
        node.selected = true;
        state.selectedNodeId = action.payload;
      } else {
        state.selectedNodeId = undefined;
      }
    },
    deleteNode(state, action: PayloadAction<string>) {
      state.nodes = state.nodes.filter((node) => node.id !== action.payload);
      state.edges = state.edges.filter(
        (edge) =>
          edge.source !== action.payload && edge.target !== action.payload
      );
      if (state.selectedNodeId === action.payload) {
        state.selectedNodeId = undefined;
      }
    },
  },
});

export const {
  addNode,
  addMediaExcerpt,
  updateNode,
  deleteNode,
  addEdge,
  removeEdge,
  selectNode,
} = nodesSlice.actions;

export default nodesSlice.reducer;
