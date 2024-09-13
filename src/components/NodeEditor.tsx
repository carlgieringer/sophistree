// src/components/NodeEditor.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { updateNode } from "../store/nodesSlice";

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(
      updateNode({ id: selectedNode.id, updates: { content: e.target.value } })
    );
  };

  return (
    <div>
      <textarea value={selectedNode.content} onChange={handleContentChange} />
    </div>
  );
};

export default NodeEditor;
