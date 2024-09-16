// src/components/NodeEditor.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import {
  updateNode,
  updateJustificationNode,
  Polarity,
  Node,
  PropositionNode,
  updatePropositionNode,
  JustificationNode,
  MediaExcerptNode,
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

  const editor = chooseEditor(selectedNode);
  return editor;
};

function chooseEditor(node: Node) {
  switch (node.type) {
    case "Proposition":
      return <PropositionEditor node={node} />;
    case "Justification":
      return <JustificationEditor node={node} />;
    case "MediaExcerpt":
      return <MediaExcerptEditor node={node} />;
    default:
      return <div>Unknown node type</div>;
  }
}

function PropositionEditor({ node }: { node: PropositionNode }) {
  const dispatch = useDispatch();

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    dispatch(
      updatePropositionNode({ id: node.id, updates: { text } })
    );
  }
  return (
    <div>
      <input type="text" value={node.text} onChange={handleTextChange} />
    </div>
  );
}

function JustificationEditor({ node }: { node: JustificationNode }) {
  const dispatch = useDispatch();

  const handlePolarityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(
      updateJustificationNode({
        id: node.id,
        updates: { polarity: e.target.value as Polarity },
      })
    );
  };
  return (
    <div>
      <select onChange={handlePolarityChange} value={node.polarity}>
        <option value="Positive">Positive</option>
        <option value="Negative">Negative</option>
      </select>
    </div>
  );
}

function MediaExcerptEditor({ node }: { node: MediaExcerptNode }) {
  return <div>MediaExcerptEditor</div>;
}

export default NodeEditor;
