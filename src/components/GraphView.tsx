// src/components/GraphView.tsx
import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import cytoscape, {
  NodeSingular,
  EventObjectNode,
  Position,
  EventObject,
} from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import contextMenus from "cytoscape-context-menus";
import { v4 as uuidv4 } from "uuid";
import cola from "cytoscape-cola";
import coseBilkent from "cytoscape-cose-bilkent";
import dagre from "cytoscape-dagre";
import elk from "cytoscape-elk";

import "cytoscape-context-menus/cytoscape-context-menus.css";

import { RootState } from "../store";
import {
  addNode,
  completeDrag,
  selectNode,
  deleteNode,
  resetSelection,
} from "../store/nodesSlice";

cytoscape.use(cola);
cytoscape.use(coseBilkent);
cytoscape.use(dagre);
cytoscape.use(elk);
cytoscape.use(contextMenus);

const GraphView: React.FC = () => {
  const nodes = useSelector((state: RootState) => state.nodes.nodes);
  const edges = useSelector((state: RootState) => state.nodes.edges);
  const selectedNodeId = useSelector(
    (state: RootState) => state.nodes.selectedNodeId
  );
  const dispatch = useDispatch();
  const cyRef = useRef<cytoscape.Core | undefined>(undefined);

  const nodeIdToParentId = nodes.reduce((acc, node) => {
    switch (node.type) {
      case "Justification":
        acc[node.basisId] = node.id;
        break;
      case "PropositionCompound":
        node.atomIds.forEach((atomId) => {
          acc[atomId] = node.id;
        });
        break;
    }
    return acc;
  }, {} as { [key: string]: string });

  const elements = [
    ...nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.content,
        type: node.type,
        parent: nodeIdToParentId[node.id],
      },
    })),
    ...edges.map((edge) => ({
      data: { source: edge.source, target: edge.target },
    })),
  ];

  useEffect(() => {
    cyRef.current?.nodes().subtract(`#${selectedNodeId}`).unselect();
    cyRef.current?.nodes(`#${selectedNodeId}`).select();
  }, [selectedNodeId]);

  // https://github.com/cytoscape/cytoscape.js-cola?tab=readme-ov-file#api
  const colaLayout = {
    name: "cola",
    flow: { axis: "y", minSeparation: 30 },
    unconstrIter: 10,
    userConstIter: 20,
  };
  const coseBilkentLayout = { name: "cose-bilkent" };
  const dagreLayout = { name: "dagre" };
  const breadthfirstLayout = {
    name: "breadthfirst",
    directed: true,
    grid: false, // whether to create an even grid into which the DAG is placed (circle:false only)
    roots: undefined, // the roots of the trees
    depthSort: undefined, // a sorting function to order nodes at equal depth. e.g. function(a, b){ return a.data('weight') - b.data('weight') }
    animate: true,
    animationDuration: 500, // duration of animation in ms if enabled
    animationEasing: undefined, // easing of animation if enabled,
  };
  const elkLayout = {
    name: "elk",
    // All options are available at http://www.eclipse.org/elk/reference.html
    //
    // 'org.eclipse.' can be dropped from the identifier. The subsequent identifier has to be used as property key in quotes.
    // E.g. for 'org.eclipse.elk.direction' use:
    // 'elk.direction'
    //
    // Enums use the name of the enum as string e.g. instead of Direction.DOWN use:
    // 'elk.direction': 'DOWN'
    //
    // The main field to set is `algorithm`, which controls which particular layout algorithm is used.
    // Example (downwards layered layout):
    elk: {
      algorithm: "layered",
      "elk.direction": "UP",
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.aspectRatio": "1.5",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
  };

  const layoutType = "elk" as
    | "elk"
    | "breadthfirst"
    | "dagre"
    | "cola"
    | "cose-bilkent";
  function getLayout() {
    switch (layoutType) {
      case "elk":
        return elkLayout;
      case "breadthfirst":
        return breadthfirstLayout;
      case "dagre":
        return dagreLayout;
      case "cola":
        return colaLayout;
      case "cose-bilkent":
        return coseBilkentLayout;
    }
  }

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
        shape: "rectangle",
        "compound-sizing-wrt-labels": "include",
        "padding-left": "10px",
        "padding-right": "10px",
        "padding-top": "10px",
        "padding-bottom": "10px",
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
        width: 2,
        "line-color": "#ccc",
        "target-arrow-color": "#ccc",
        "target-arrow-shape": "triangle",
        "curve-style": "straight",
        "arrow-scale": 1.5,
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#333",
      },
    },
    {
      selector: ".dragging",
      style: {
        opacity: 0.5,
      },
    },
    {
      selector: ".hover-highlight",
      style: {
        "border-width": 3,
        "border-color": "#ff0000",
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
            selector: "node, edge",
            onClickFunction: function (event) {
              var target = event.target;
              dispatch(deleteNode(target.id()));
            },
            hasTrailingDivider: true,
          },
          {
            id: "layout",
            content: "Layout",
            selector: "*",
            tooltipText: "Layout graph",
            onClickFunction: function (event) {
              cyRef.current?.layout(getLayout()).run();
            },
            coreAsWell: true,
          },
        ],
      });

      cy.on("tap", "node", (event: EventObjectNode) => {
        const nodeId = event.target.id();
        dispatch(selectNode(nodeId));
      });

      cy.on("tap", (event: EventObject) => {
        if (event.target === cy) {
          dispatch(resetSelection());
        }
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

      let dragSource = undefined as NodeSingular | undefined;
      cy.on("mousedown", "node", (event: cytoscape.EventObjectNode) => {
        dragSource = event.target;
        dragSource.ancestors().add(dragSource).addClass("dragging");
      });

      function nodeContainsPosition(node: NodeSingular, pos: Position) {
        const bb = node.boundingBox();
        return (
          bb.x1 <= pos.x && pos.x <= bb.x2 && bb.y1 <= pos.y && pos.y <= bb.y2
        );
      }

      function nodeIncludesNode(node1: NodeSingular, node2: NodeSingular) {
        const bb1 = node1.boundingBox();
        const bb2 = node2.boundingBox();
        return (
          bb1.x1 <= bb2.x1 &&
          bb2.x2 <= bb1.x2 &&
          bb1.y1 <= bb2.y1 &&
          bb2.y2 <= bb1.y2
        );
      }

      function getInnermostNodeContainingNodesPosition(
        position: Position,
        excludeNode: NodeSingular
      ) {
        const node = cy
          .nodes()
          .reduce(
            (innermost, curr) =>
              curr !== excludeNode &&
              !curr.edgesWith(excludeNode).length &&
              !excludeNode.ancestors().contains(curr) &&
              nodeContainsPosition(curr, position) &&
              (!innermost || nodeIncludesNode(innermost, curr))
                ? curr
                : innermost,
            undefined as NodeSingular | undefined
          );
        return node;
      }

      // Store mousePosition for drags because using event.position caused weird
      // behavior when dragging nodes.
      let mousePosition: Position = { x: 0, y: 0 };
      cy.on("mousemove", (event: EventObject) => {
        mousePosition = event.position;
      });

      cy.on("drag", "node", (event: EventObjectNode) => {
        const hoverNode = getInnermostNodeContainingNodesPosition(
          mousePosition,
          event.target
        );
        cy.nodes(".hover-highlight")
          .subtract(hoverNode ?? cy.collection())
          .removeClass("hover-highlight");
        hoverNode?.addClass("hover-highlight");
      });

      cy.on("mouseup", "node", (event: any) => {
        if (dragSource) {
          dragSource.ancestors().add(dragSource).removeClass("dragging");
          const dragTargetNode = getInnermostNodeContainingNodesPosition(
            mousePosition,
            dragSource
          );
          if (dragTargetNode) {
            dispatch(
              completeDrag({
                sourceId: dragSource.id(),
                targetId: dragTargetNode.id(),
                targetParentId: dragTargetNode.parent().first().id(),
              })
            );
          }
        }
        dragSource = undefined;
        cy.nodes().removeClass("hover-highlight");
      });

      cy.on("mouseup", (event: any) => {
        if (event.target === cy) {
          dragSource = undefined;
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
      cyRef.current.layout(getLayout()).run();
    }
  }, [nodes, edges]);

  return (
    <CytoscapeComponent
      elements={elements}
      layout={getLayout()}
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
  );
};

export default GraphView;
