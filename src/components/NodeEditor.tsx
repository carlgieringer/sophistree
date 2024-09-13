// src/components/NodeEditor.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import {
  updateNode,
  updateJustificationNode,
  Polarity,
} from "../store/nodesSlice";

const NodeEditor: React.FC = () => {
  const selectedNodeId = useSelector(
    (state: RootState) => state.nodes.selectedNodeId
  );
  const selectedNode = useSelector((state: RootState) =>
    state.nodes.nodes.find((node) => node.id === selectedNodeId)
  );
  const dispatch = useDispatch();

  if (!selectedNode) {
    return <div>No node selected</div>;
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      updateNode({ id: selectedNode.id, updates: { content: e.target.value } })
    );
  };

  const handlePolarityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(
      updateJustificationNode({
        id: selectedNode.id,
        updates: { polarity: e.target.value as Polarity },
      })
    );
  };

  const polarityDropdown = selectedNode.type === "Justification" && (
    <select onChange={handlePolarityChange} value={selectedNode.polarity}>
      <option value="Positive">Positive</option>
      <option value="Negative">Negative</option>
    </select>
  );

  return (
    <div>
      <input
        type="text"
        value={selectedNode.content}
        onChange={handleContentChange}
      />
      {polarityDropdown}
    </div>
  );
};

export default NodeEditor;
