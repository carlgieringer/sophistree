// src/components/NodeList.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { addNode, setSelectedNode } from '../store/nodesSlice';

const NodeList: React.FC = () => {
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const dispatch = useDispatch();

  const handleAddNode = () => {
    dispatch(addNode({
      id: Date.now().toString(),
      type: 'Proposition',
      content: 'New Node',
    }));
  };

  return (
    <div>
      {nodes.map(node => (
        <div key={node.id} onClick={() => dispatch(setSelectedNode(node.id))}>
          {node.content}
        </div>
      ))}
      <button onClick={handleAddNode}>Add Node</button>
    </div>
  );
};

export default NodeList;
