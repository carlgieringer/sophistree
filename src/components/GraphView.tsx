import React, { useEffect, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import cytoscape, {
  NodeSingular,
  EventObjectNode,
  Position,
  EventObject,
  EdgeSingular,
  EdgeDataDefinition,
} from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import contextMenus from "cytoscape-context-menus";
import { v4 as uuidv4 } from "uuid";
import elk from "cytoscape-elk";

import { Entity, MediaExcerpt, Proposition } from "../store/entitiesSlice";
import htmlNode from "../cytoscape/reactNodes";
import { RootState } from "../store";
import {
  addEntity,
  completeDrag,
  selectEntity,
  deleteEntity,
  resetSelection,
} from "../store/entitiesSlice";
import {
  carrot,
  nephritis,
  peterRiver,
  pomegranate,
  sunflower,
} from "../colors";

import "cytoscape-context-menus/cytoscape-context-menus.css";
import "./GraphView.css";

cytoscape.use(elk);
cytoscape.use(contextMenus);
cytoscape.use(htmlNode);

const GraphView: React.FC = () => {
  const entities = useSelector((state: RootState) => state.entities.entities);
  const elements = useMemo(() => makeElements(entities), [entities]);

  const cyRef = useRef<cytoscape.Core | undefined>(undefined);

  if (cyRef.current) {
    correctInvalidNodes(cyRef.current, elements);
  }

  const selectedEntityId = useSelector(
    (state: RootState) => state.entities.selectedEntityId
  );
  useEffect(() => {
    cyRef.current?.nodes().subtract(`#${selectedEntityId}`).unselect();
    cyRef.current?.nodes(`#${selectedEntityId}`).select();
  }, [selectedEntityId]);

  const dispatch = useDispatch();
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.reactNodes({
        layout: getLayout(),
        nodes: reactNodesConfig,
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
              dispatch(deleteEntity(target.id()));
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
        dispatch(selectEntity(nodeId));
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
            type: "Proposition" as const,
            text: "New Node",
          };
          dispatch(addEntity(newNode));
          cy.add({
            data: {
              ...newNode,
              label: newNode.text,
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

      // Store mousePosition for drags because using event.position caused weird
      // behavior when dragging nodes.
      let mousePosition: Position = { x: 0, y: 0 };
      cy.on("mousemove", (event: EventObject) => {
        mousePosition = event.position;
      });

      cy.on("drag", "node", (event: EventObjectNode) => {
        const hoverNode = getInnermostNodeContainingNodesPosition(
          cy,
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
            cy,
            mousePosition,
            dragSource
          );
          if (dragTargetNode) {
            dispatch(
              completeDrag({
                sourceId: dragSource.id(),
                targetId: dragTargetNode.id(),
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

  useEffect(() => layoutGraph, [elements]);

  function layoutGraph() {
    cyRef.current?.layout(getLayout()).run();
  }

  return (
    <CytoscapeComponent
      elements={elements}
      layout={getLayout()}
      stylesheet={stylesheet}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
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

function makeElements(entities: Entity[]) {
  const { entityIdToParentId, canonicalJustificationByBasisId, edges } =
    entities.reduce(
      (acc, entity) => {
        const { entityIdToParentId, canonicalJustificationByBasisId, edges } =
          acc;
        switch (entity.type) {
          case "Justification":
            // Since the same basis can appear in multiple justifications, but we want
            // to display this as a single justification node with multiple edges
            // targeting each of the justification's targets, we choose the first justification
            // as the canonical one we will display.
            let source = canonicalJustificationByBasisId.get(entity.basisId);
            if (!source) {
              source = entity.id;
              entityIdToParentId.set(entity.basisId, entity.id);
              canonicalJustificationByBasisId.set(entity.basisId, entity.id);
            }
            edges.push({
              // Give the edge related to the justification for debugging.
              id: `justification-edge-${entity.id}`,
              source,
              target: entity.targetId,
              polarity: entity.polarity,
            });
            break;
          case "PropositionCompound":
            entity.atomIds.forEach((atomId) => {
              entityIdToParentId.set(atomId, entity.id);
            });
            break;
        }
        return acc;
      },
      {
        entityIdToParentId: new Map(),
        canonicalJustificationByBasisId: new Map(),
        edges: [],
      } as {
        entityIdToParentId: Map<string, string>;
        canonicalJustificationByBasisId: Map<string, string>;
        edges: EdgeDataDefinition[];
      }
    );

  const canonicalJustifications = new Set(
    canonicalJustificationByBasisId.values()
  );
  const elements = [
    ...entities
      .filter(
        (entity) =>
          entity.type !== "Justification" ||
          canonicalJustifications.has(entity.id)
      )
      .map((entity) => ({
        data: {
          ...entity,
          parent: entityIdToParentId.get(entity.id),
        },
      })),
    ...edges.map((edge) => ({
      data: { ...edge },
    })),
  ];
  return elements;
}

/** After we delete entities we need to remove them from Cytoscape */
function correctInvalidNodes(
  cy: cytoscape.Core,
  elements: cytoscape.ElementDefinition[]
) {
  const extantIds = elements.map((el) => el.data.id).filter((id) => id);

  // Remove invalid parents first. Otherwise the nodes disappear when we remove the
  // invalid parents below.
  const extantIdsSet = new Set(extantIds);
  cy.nodes().forEach((node) => {
    if (node.isChild() && !extantIdsSet.has(node.parent().first().data().id)) {
      node.move({ parent: null });
    }
  });

  const extantElementsSelector = extantIds.map((id) => `#${id}`).join(",");
  cy.elements().subtract(extantElementsSelector).remove();
}

const stylesheet = [
  {
    selector: "node",
    style: {
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": "200px",
    } as const,
  },
  {
    selector: 'node[type="Proposition"]',
    style: {
      shape: "round-rectangle",
      label: "data(text)",
      width: "label",
      height: "label",
      // Hide the default cytoscape content in favor of the reactNodes content
      opacity: 0,
    },
  },
  {
    selector: `node[type="Proposition"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: 'node[type="Justification"]',
    style: {
      shape: "round-rectangle",
      "background-color": "#34495e",
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
      shape: "round-rectangle",
      label: "data(quotation)",
      width: "label",
      height: "label",
      // Hide the default cytoscape content in favor of the reactNodes content
      opacity: 0,
    },
  },
  {
    selector: `node[type="MediaExcerpt"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: `node[type="PropositionCompound"]`,
    style: {
      shape: "round-rectangle",
      "background-color": "#2980b9",
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
      "line-color": nephritis,
      "target-arrow-color": nephritis,
    },
  },
  {
    selector: `edge[polarity="Negative"]`,
    style: {
      width: 2,
      "line-color": pomegranate,
      "target-arrow-color": pomegranate,
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
    selector: `.dragging[type="Justification"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: `.dragging[type="PropositionCompound"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: ".hover-highlight",
    style: {
      "border-width": 3,
      "border-color": carrot,
    },
  },
];

const reactNodesConfig = [
  {
    query: `node[type="Proposition"]`,
    template: function (data: Proposition) {
      return (
        <>
          <p>{data.text}</p>
        </>
      );
    },
    syncClasses: ["hover-highlight", "dragging"],
    containerCSS: {
      padding: "1em",
      backgroundColor: peterRiver,
      borderRadius: "8px",
    },
  },
  {
    query: `node[type="MediaExcerpt"]`,
    template: function (data: MediaExcerpt) {
      return (
        <>
          <p>{data.quotation}</p>
          <a
            href={data.canonicalUrl}
            onClick={(event) => {
              if (!data.canonicalUrl) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              openUrlInActiveTab(data.canonicalUrl);
              return false;
            }}
          >
            {data.sourceName}
          </a>
        </>
      );
    },
    syncClasses: ["hover-highlight", "dragging"],
    containerCSS: {
      padding: "1em",
      backgroundColor: peterRiver,
      borderRadius: "8px",
    },
  },
];

function layoutPropositionCompoundAtomsVertically(cy: cytoscape.Core) {
  const compoundNodes = cy
    .nodes()
    .filter(
      (entity) =>
        entity.isParent() && entity.data("type") === "PropositionCompound"
    );

  compoundNodes.forEach((compound) => {
    const children = compound.children();

    if (children.length <= 1) {
      return;
    }
    const compoundBbox = compound.boundingBox();

    let totalChildHeight = 0;
    let previousChildBottomMargin = 0;

    children.forEach((child, index) => {
      const childWidth = child.width();
      const childHeight = child.height();
      const leftPadding = getNumericStyle(child, "padding-left");
      const leftMargin = getNumericStyle(child, "margin-left");
      const topPadding = getNumericStyle(child, "padding-top");
      const topMargin = getNumericStyle(child, "margin-top");
      const bottomPadding = getNumericStyle(child, "padding-bottom");
      const bottomMargin = getNumericStyle(child, "margin-bottom");

      const xPosition =
        compoundBbox.x1 + leftMargin + leftPadding + childWidth / 2;

      let topOffset;
      if (index === 0) {
        topOffset = topMargin + topPadding;
      } else {
        const collapsedMargin = Math.max(previousChildBottomMargin, topMargin);
        topOffset = collapsedMargin + topPadding;
      }

      const yPosition =
        compoundBbox.y1 + totalChildHeight + topOffset + childHeight / 2;
      totalChildHeight += childHeight + topOffset + bottomPadding;
      child.position({
        x: xPosition,
        y: yPosition,
      });

      previousChildBottomMargin = bottomMargin;
    });

    const lastBottomMargin = getNumericStyle(children.last(), "margin-bottom");
    compound.style({
      width: compoundBbox.w,
      height: Math.max(compoundBbox.h, totalChildHeight + lastBottomMargin),
    });
  });
}

function nodeContainsPosition(node: NodeSingular, pos: Position) {
  const bb = node.boundingBox();
  return bb.x1 <= pos.x && pos.x <= bb.x2 && bb.y1 <= pos.y && pos.y <= bb.y2;
}

function nodeIncludesNode(node1: NodeSingular, node2: NodeSingular) {
  const bb1 = node1.boundingBox();
  const bb2 = node2.boundingBox();
  return (
    bb1.x1 <= bb2.x1 && bb2.x2 <= bb1.x2 && bb1.y1 <= bb2.y1 && bb2.y2 <= bb1.y2
  );
}

function getInnermostNodeContainingNodesPosition(
  cy: cytoscape.Core,
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

/**
 * Returns a numeric value for the given style property of the node.
 *
 * Cytoscape's node defines a getNumericStyle, but it throws for style names
 * that aren't defined directly. I.e. if you define `padding: 1em` and ask
 * for `padding-top`, it throws. node.style works for style names that are
 * not defined directly, but returns a string. This function works for both.
 */
function getNumericStyle(node: cytoscape.NodeSingular, name: string) {
  try {
    return styleLengthToPx(node.style(name));
  } catch {
    return 0;
  }
}

function styleLengthToPx(length: string | number): number {
  if (typeof length === "number") {
    return length;
  }
  if (length.endsWith("px")) {
    return parseFloat(length);
  }
  if (length.endsWith("em")) {
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    return parseFloat(length) * fontSize;
  }
  throw new Error(`Unsupported length unit: ${length}`);
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
