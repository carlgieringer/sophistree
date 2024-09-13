// src/store/nodesSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Node {
  id: string;
  type: "Proposition" | "Justification" | "MediaExcerpt";
  content: string;
}

interface Edge {
  source: string;
  target: string;
}

interface NodesState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
}

const initialState: NodesState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
};

export const nodesSlice = createSlice({
  name: "nodes",
  initialState,
  reducers: {
    addNode: (state, action: PayloadAction<Node>) => {
      state.nodes.push(action.payload);
    },
    updateNode: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Node> }>
    ) => {
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
    deleteNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter((node) => node.id !== action.payload);
      state.edges = state.edges.filter(
        (edge) =>
          edge.source !== action.payload && edge.target !== action.payload
      );
    },
    setSelectedNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      state.edges.push(action.payload);
    },
    removeEdge: (state, action: PayloadAction<Edge>) => {
      state.edges = state.edges.filter(
        (edge) =>
          !(
            edge.source === action.payload.source &&
            edge.target === action.payload.target
          )
      );
    },
  },
});

export const {
  addNode,
  updateNode,
  deleteNode,
  setSelectedNode,
  addEdge,
  removeEdge,
} = nodesSlice.actions;

export default nodesSlice.reducer;
