// src/components/GraphView.tsx
import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import cytoscape from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import dagre from "cytoscape-dagre";
import contextMenus from "cytoscape-context-menus";
import "cytoscape-context-menus/cytoscape-context-menus.css";
import { v4 as uuidv4 } from "uuid";

import { RootState } from "../store";
import { addNode, addEdge, selectNode, deleteNode } from "../store/nodesSlice";

cytoscape.use(dagre);
cytoscape.use(contextMenus);

const GraphView: React.FC = () => {
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const edges = useSelector((state: RootState) => state.nodes.edges);
  const dispatch = useDispatch();
  const cyRef = useRef<cytoscape.Core | undefined>(undefined);

  const elements = [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.content,
        type: node.type,
        selected: node.selected,
      },
    })),
    ...edges.map((edge) => ({
      data: { source: edge.source, target: edge.target },
    })),
  ];

  const layout = {
    name: "dagre",
    rankDir: "TB",
    padding: 50,
  };

  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#666",
        label: "data(label)",
        width: "label",
        height: "label",
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "text-max-width": "200px",
      } as const,
    },
    {
      selector: 'node[type="Proposition"]',
      style: {
        "background-color": "#6FB1FC",
        shape: "roundrectangle",
      },
    },
    {
      selector: 'node[type="Justification"]',
      style: {
        "background-color": "#EDA1ED",
        shape: "diamond",
      },
    },
    {
      selector: 'node[type="MediaExcerpt"]',
      style: {
        "background-color": "#F5A45D",
        shape: "rectangle",
      },
    },
    {
      selector: "edge",
      style: {
        width: 3,
        "line-color": "#ccc",
        "target-arrow-color": "#ccc",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#333",
      },
    },
  ];

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.contextMenus({
        menuItems: [
          {
            id: "delete",
            content: "Delete",
            tooltipText: "Delete node",
            selector: "node",
            onClickFunction: function (event) {
              var target = event.target;
              dispatch(deleteNode(target.id()));
            },
            hasTrailingDivider: true,
          },
        ],
      });

      cy.on("tap", "node", (event: any) => {
        const nodeId = event.target.id();
        dispatch(selectNode(nodeId));
      });

      cy.on("dbltap", (event: any) => {
        if (event.target === cy) {
          const pos = event.position;
          const newNode = {
            id: uuidv4(),
            type: "Proposition",
            content: "New Node",
          } as const;
          dispatch(addNode(newNode));
          cy.add({
            data: {
              id: newNode.id,
              label: newNode.content,
              type: newNode.type,
            },
            position: pos,
          });
        }
      });

      let sourceNode: string | null = null;
      cy.on("mousedown", "node", (event: any) => {
        sourceNode = event.target.id();
      });

      cy.on("mouseup", "node", (event: any) => {
        if (sourceNode && sourceNode !== event.target.id()) {
          dispatch(addEdge({ source: sourceNode, target: event.target.id() }));
        }
        sourceNode = null;
      });

      cy.on("mouseup", (event: any) => {
        if (event.target === cy) {
          sourceNode = null;
        }
      });

      cy.on("zoom", (event: any) => {
        const zoom = cy.zoom();
        cy.zoom({
          level: zoom,
          renderedPosition: event.position,
        });
      });
    }
  }, [dispatch]);

  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.layout(layout).run();
    }
  }, [nodes, edges]);

  return (
    <div style={{ height: "400px", width: "100%" }}>
      <CytoscapeComponent
        elements={elements}
        layout={layout}
        stylesheet={stylesheet}
        style={{ width: "100%", height: "100%" }}
        cy={(cy) => {
          cyRef.current = cy;
        }}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        minZoom={0.5}
        maxZoom={2}
      />
    </div>
  );
};

export default GraphView;
