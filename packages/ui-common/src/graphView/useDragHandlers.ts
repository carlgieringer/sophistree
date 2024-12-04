import { MutableRefObject } from "react";
import cytoscape, {
  EdgeSingular,
  EventObject,
  EventObjectNode,
  NodeSingular,
  Position,
  SingularElementArgument,
} from "cytoscape";
import { useEffect } from "react";

import { EntityType } from "@sophistree/common";
import { getEntityId } from "./entityIds";

export interface OnCompleteDrag {
  (ids: { sourceId: string; targetId: string }): void;
}

export function useDragHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onCompleteDrag: OnCompleteDrag | undefined,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    let dragSource = undefined as NodeSingular | undefined;
    let dragSourceOriginalPosition: Position | undefined;
    const mouseDownOnNodeHandler = (event: cytoscape.EventObjectNode) => {
      dragSource = event.target;
      dragSourceOriginalPosition = { ...dragSource.position() };
      dragSource.ancestors().add(dragSource).addClass("dragging");
    };

    // Store mousePosition for drags because using event.position caused weird
    // behavior when dragging nodes.
    let mousePosition: Position = { x: 0, y: 0 };
    const mouseMoveHandler = (event: EventObject) => {
      mousePosition = event.position;
    };

    const dragNodeHandler = (event: EventObjectNode) => {
      cy.elements(".hover-highlight").removeClass("hover-highlight");

      const hoverTarget = getClosestValidDropTarget(
        cy,
        mousePosition,
        event.target,
      );
      if (
        hoverTarget &&
        dragSource &&
        isValidDropTarget(dragSource, hoverTarget)
      ) {
        // Highlight the entity everywhere. In particular, highlight the justification node and
        // two edges when any one of them is hovered.
        const hoverEntityId = getEntityId(hoverTarget);
        cy.elements()
          .filter((e) => e.data("entity.id") === hoverEntityId)
          .addClass("hover-highlight");
      }
    };

    const mouseUpHandler = (event: EventObject) => {
      if (event.target === cy) {
        if (dragSource && dragSourceOriginalPosition) {
          // Return the node to its original position
          dragSource.position(dragSourceOriginalPosition);
        }
        dragSource = undefined;
        dragSourceOriginalPosition = undefined;
        cy.nodes().removeClass("hover-highlight");
        return;
      }

      if (dragSource) {
        dragSource.ancestors().add(dragSource).removeClass("dragging");
        const dragTarget = getClosestValidDropTarget(
          cy,
          mousePosition,
          dragSource,
        );
        if (dragTarget && isValidDropTarget(dragSource, dragTarget)) {
          onCompleteDrag?.({
            sourceId: getEntityId(dragSource),
            targetId: getEntityId(dragTarget),
          });
          if (
            dragSourceOriginalPosition &&
            getEntityType(dragSource) === "Proposition" &&
            getEntityType(dragTarget) === "MediaExcerpt"
          ) {
            dragSource.position(dragSourceOriginalPosition);
          }
        } else if (dragSourceOriginalPosition) {
          // Return the node to its original position
          dragSource.position(dragSourceOriginalPosition);
        }
      }
      dragSource = undefined;
      dragSourceOriginalPosition = undefined;
      cy.elements().removeClass("hover-highlight");
    };

    cy.on("mousedown", "node", mouseDownOnNodeHandler);
    cy.on("mousemove", mouseMoveHandler);
    cy.on("drag", "node", dragNodeHandler);
    cy.on("mouseup", mouseUpHandler);

    return () => {
      cy.off("mousedown", "node", mouseDownOnNodeHandler);
      cy.off("mousemove", mouseMoveHandler);
      cy.off("drag", "node", dragNodeHandler);
      cy.off("mouseup", mouseUpHandler);
    };
  }, [cyRef, onCompleteDrag]);
}

function getClosestValidDropTarget(
  cy: cytoscape.Core,
  position: Position,
  dragNode: NodeSingular,
) {
  const { excludedNodes, excludedEdges } = getExcludedElements(cy, dragNode);

  const nodeTarget = getInnermostNodeContainingPosition(
    cy,
    position,
    excludedNodes,
  );

  const closestEdge = getClosestEdge(cy, position, excludedEdges);

  if (nodeTarget && closestEdge) {
    const nodeZIndex = getZIndex(nodeTarget) ?? -Infinity;
    const edgeZIndex = getZIndex(closestEdge) ?? -Infinity;

    if (edgeZIndex > nodeZIndex) {
      return closestEdge;
    } else {
      return nodeTarget;
    }
  }

  return nodeTarget || closestEdge;
}

function getExcludedElements(cy: cytoscape.Core, dragNode: NodeSingular) {
  const dragNodeAndAncestors = dragNode.ancestors().union(dragNode);

  const justificationIds = cy.edges().reduce((ids, edge) => {
    if (
      edge.data("type") === "Justification" &&
      (dragNodeAndAncestors.contains(edge.source()) ||
        dragNodeAndAncestors.contains(edge.target()))
    ) {
      // This justification is already connected to the dragNode, so exclude all it's elements too.
      ids.add(getEntityId(edge));
      if (getEntityType(edge.target()) === "Justification") {
        // The dragNode is already targeting this justification, so exclude all it's elements too.
        ids.add(getEntityId(edge.target()));
      }
    }
    return ids;
  }, new Set<string>());

  // Exclude all elements corresponding to justificationIds and their targets
  const { excludedNodes, excludedEdges } = cy.elements().reduce(
    (acc, element) => {
      const entityId = getEntityId(element);
      if (justificationIds.has(entityId)) {
        if (element.isNode()) {
          acc.excludedNodes.add(element);
        } else if (element.isEdge()) {
          acc.excludedEdges.add(element);
          acc.excludedNodes.add(element.target());
        }
      }
      return acc;
    },
    {
      excludedNodes: new Set<NodeSingular>(),
      excludedEdges: new Set<EdgeSingular>(),
    },
  );

  // Add dragNode and its ancestors to excluded nodes
  dragNodeAndAncestors.forEach((node) => {
    excludedNodes.add(node);
  });

  return { excludedNodes, excludedEdges };
}

function getClosestEdge(
  cy: cytoscape.Core,
  position: Position,
  excludedEdges: Set<EdgeSingular>,
) {
  const distanceThreshold = 10;
  const angleThreshold = Math.PI / 2;

  const nodeTarget = getInnermostNodeContainingPosition(
    cy,
    position,
    new Set(),
  );
  // If the drag is over a node, exclude its edges too.
  nodeTarget
    ?.ancestors()
    .add(nodeTarget)
    .connectedEdges()
    .forEach((edge) => {
      excludedEdges.add(edge);
    });

  const closestEdge = cy.edges().reduce(
    (closest, edge) => {
      if (excludedEdges.has(edge)) {
        return closest;
      }

      const p1 = edge.source().position();
      const p2 = edge.target().position();
      const distance = distanceToLineSegment(p1, p2, position);

      // The distance is to the infinite line, not the finite line segment. We want to
      // exlude positions that are along the line but not close to the line segment.
      const angleBetweenPositionAndEndpoints = angleBetween(p1, position, p2);

      if (
        distance < distanceThreshold &&
        angleBetweenPositionAndEndpoints > angleThreshold &&
        (!closest.edge || distance < closest.distance)
      ) {
        return { edge, distance };
      }
      return closest;
    },
    { edge: undefined, distance: Infinity } as {
      edge: EdgeSingular | undefined;
      distance: number;
    },
  );
  return closestEdge.edge;
}

/** Returns the angle between the line segments p1p2 and p2p3. */
function angleBetween(p1: Position, p2: Position, p3: Position) {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const magnitudeProduct =
    Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  return Math.acos(dotProduct / magnitudeProduct);
}

/**
 * Returns the minimum distance from a line segment defined by two points to a third point.
 *
 * See https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Line_defined_by_two_points
 */
function distanceToLineSegment(
  p1: Position,
  p2: Position,
  p: Position,
): number {
  const dy = p2.y - p1.y;
  const dx = p2.x - p1.x;
  const numerator = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
  const denominator = Math.sqrt(dy * dy + dx * dx);
  return numerator / denominator;
}

function getInnermostNodeContainingPosition(
  cy: cytoscape.Core,
  position: Position,
  excludedNodes: Set<NodeSingular>,
) {
  const node = cy
    .nodes()
    .reduce(
      (innermost, curr) =>
        !excludedNodes.has(curr) &&
        nodeContainsPosition(curr, position) &&
        (!innermost || nodeIncludesNode(innermost, curr))
          ? curr
          : innermost,
      undefined as NodeSingular | undefined,
    );
  return node;
}

const validPropositionDropTargets = new Set([
  "PropositionCompound",
  "Justification",
  "Proposition",
  "MediaExcerpt",
]);
const validMediaExcerptDropTarges = new Set(["Justification", "Proposition"]);

function isValidDropTarget(
  source: SingularElementArgument,
  target: SingularElementArgument,
): boolean {
  const sourceType = getEntityType(source);
  const targetType = getEntityType(target);

  switch (sourceType) {
    case "Proposition":
      return validPropositionDropTargets.has(targetType);
    case "MediaExcerpt":
      return validMediaExcerptDropTarges.has(targetType);
    default:
      return false;
  }
}

function getEntityType(element: SingularElementArgument): EntityType {
  const entityType = element.data("entity.type") as EntityType | undefined;
  if (!entityType) {
    throw new Error(`entityType not found for element ID ${element.id()}`);
  }
  return entityType;
}

function getZIndex(element: SingularElementArgument) {
  return element.style("z-index") as number | undefined;
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
