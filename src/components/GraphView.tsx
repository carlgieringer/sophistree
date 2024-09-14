import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import cytoscape, {
  NodeSingular,
  EventObjectNode,
  Position,
  EventObject,
  EdgeSingular,
} from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import contextMenus from "cytoscape-context-menus";
import { v4 as uuidv4 } from "uuid";
import elk from "cytoscape-elk";

import { Node, MediaExcerptNode } from "../store/nodesSlice";
import htmlNode from "../cytoscape/htmlNode";

import "cytoscape-context-menus/cytoscape-context-menus.css";

import { RootState } from "../store";
import {
  addNode,
  completeDrag,
  selectNode,
  deleteNode,
  resetSelection,
} from "../store/nodesSlice";
import { url } from "inspector";
import { sunflower } from "../colors";

cytoscape.use(elk);
cytoscape.use(contextMenus);
cytoscape.use(htmlNode);

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

  function makeData(node: Node) {
    switch (node.type) {
      case "MediaExcerpt":
        return {
          label: node.quotation,
          parent: nodeIdToParentId[node.id],
          ...node,
        };
      default:
        return {
          id: node.id,
          label: node.content,
          type: node.type,
          parent: nodeIdToParentId[node.id],
        };
    }
  }

  const elements = [
    ...nodes.map((node) => ({
      data: makeData(node),
    })),
    ...edges.map((edge) => ({
      data: { ...edge },
    })),
  ];

  useEffect(() => {
    cyRef.current?.nodes().subtract(`#${selectedNodeId}`).unselect();
    cyRef.current?.nodes(`#${selectedNodeId}`).select();
  }, [selectedNodeId]);

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
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
  };

  function getLayout() {
    return elkLayout;
  }

  const stylesheet = [
    {
      selector: "node",
      style: {
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
        "background-color": "#3498db",
        shape: "roundrectangle",
      },
    },
    {
      selector: 'node[type="Justification"]',
      style: {
        "background-color": "#34495e",
        shape: "rectangle",
        "compound-sizing-wrt-labels": "include",
        "padding-left": "10px",
        "padding-right": "10px",
        "padding-top": "10px",
        "padding-bottom": "10px",
      },
    },
    {
      selector: `node[type="MediaExcerpt"]`,
      style: {
        shape: "rectangle",
        opacity: 0,
      },
    },
    {
      selector: `node[type="PropositionCompound"]`,
      style: {
        "background-color": "#2980b9",
        shape: "rectangle",
      },
    },
    {
      selector: `edge`,
      style: {
        width: 2,
        "line-color": "#ccc",
        "target-arrow-color": "#ccc",
        "target-arrow-shape": "triangle",
        "arrow-scale": 1.5,
        "curve-style": "straight",
        "target-endpoint": (ele: EdgeSingular) => {
          const target = ele.target();
          const parent = target.parent();
          if (
            parent.data("type") === "PropositionCompound" &&
            parent.children().length > 1
          ) {
            const isSourceLeftOfTarget =
              ele.source().position().x < target.position().x;
            return isSourceLeftOfTarget ? "270deg" : "90deg";
          }
          return "outside-to-node";
        },
      },
    },
    {
      selector: `edge[polarity="Positive"]`,
      style: {
        width: 2,
        "line-color": "#27ae60",
        "target-arrow-color": "#27ae60",
      },
    },
    {
      selector: `edge[polarity="Negative"]`,
      style: {
        width: 2,
        "line-color": "#c0392b",
        "target-arrow-color": "#c0392b",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": sunflower,
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

      cy.htmlNode({
        query: `node[type="MediaExcerpt"]`,
        template: function (data: cytoscape.NodeDataDefinition) {
          const d = data as MediaExcerptNode;
          return (
            <div>
              <p>{d.quotation}</p>
              <a
                href={d.canonicalUrl}
                onClick={(event) => {
                  if (!d.canonicalUrl) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  openUrlInActiveTab(d.canonicalUrl);
                  return false;
                }}
              >
                {d.sourceName}
              </a>
            </div>
          );
        },
        containerCSS: {
          backgroundColor: "#3498db",
        },
      });

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
            onClickFunction: layoutGraph,
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

      cy.on("dbltap", (event: EventObject) => {
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
      cy.on("layoutstop", () => {
        layoutPropositionCompoundAtomsVertically(cy);
      });
    }
  }, [dispatch]);

  useEffect(() => layoutGraph, [nodes, edges]);

  function layoutGraph() {
    cyRef.current?.layout(getLayout()).run();
  }

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

const compoundChildPadding = 15;

function layoutPropositionCompoundAtomsVertically(cy: cytoscape.Core) {
  const compoundNodes = cy
    .nodes()
    .filter(
      (node) => node.isParent() && node.data("type") === "PropositionCompound"
    );

  compoundNodes.forEach((compound) => {
    const children = compound.children();
    const childCount = children.length;

    if (children.length <= 1) {
      return;
    }
    const compoundBbox = compound.boundingBox();
    const padding = compoundChildPadding;

    let totalChildHeight = 0;
    children.forEach((child, index) => {
      const childWidth = child.width();
      const childHeight = child.height();

      const xPosition = compoundBbox.x1 + padding + childWidth / 2;
      const yPosition = compoundBbox.y1 + totalChildHeight + padding;

      totalChildHeight += childHeight + padding;

      child.position({
        x: xPosition,
        y: yPosition,
      });
    });

    compound.style({
      width: compoundBbox.w,
      height: Math.max(compoundBbox.h, totalChildHeight + 2 * padding),
    });
  });
}

function openUrlInActiveTab(url: string) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    if (!activeTab.id) {
      return;
    }
    // chrome:// tabs e.g. have no URL
    if (!activeTab.url) {
      window.open(url);
      return;
    }
    chrome.tabs
      .sendMessage(activeTab.id, {
        action: "openUrl",
        url,
      })
      .catch((reason) => {
        console.error(`Failed to open URL in active tab`, reason);
      });
  });
}

export default GraphView;
