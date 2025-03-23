import { MutableRefObject } from "react";
import cytoscape, { Position } from "cytoscape";

/**
 * Gets the offset of the cytoscape container
 */
export function getContainerOffset(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
): { left: number; top: number } {
  if (!cyRef.current) return { left: 0, top: 0 };

  const container = cyRef.current.container();
  if (!container) return { left: 0, top: 0 };

  const rect = container.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
  };
}

/**
 * Transforms model coordinates to rendered coordinates
 * accounting for zoom, pan, and container offset
 */
export function modelToRenderedPosition(
  position: Position,
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  options?: {
    offsetX?: number;
    offsetY?: number;
  },
): Position {
  if (!cyRef.current) return position;

  const cy = cyRef.current;
  const zoom = cy.zoom();
  const pan = cy.pan();

  // Apply zoom and pan transformation
  let renderedX = position.x * zoom + pan.x;
  let renderedY = position.y * zoom + pan.y;

  // Account for container offsets
  const { left, top } = getContainerOffset(cyRef);
  renderedX += left + (options?.offsetX || 0);
  renderedY += top + (options?.offsetY || 0);

  return { x: renderedX, y: renderedY };
}
