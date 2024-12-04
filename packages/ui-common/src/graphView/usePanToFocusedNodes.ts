import { MutableRefObject } from "react";
import { useCallback, useEffect } from "react";

export function usePanToFocusedNodes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  focusedNodeIds: string[],
) {
  /**
   * Pan the graph to include the given nodes. Currently just centers
   * on the nodes. I'd prefer to pan the minimum amount to include the
   * nodes (with some padding) and also decrease the zoom as necessary to
   * encompass all the nodes, but I couldn't figure out how to do that. The
   * algorithm could go like:
   *
   * - Calculate the bounding box of the nodes with padding.
   * - if the view already contains the bounding box, return.
   * - Otherwise, find the first corner of the view that needs to be moved
   *   to encompass the boundign box. Update the view to move the corner
   *   to match the corresponding corner of the bounding box without affecting
   *   the zoom.
   * - If any of the other 3 corners of the bounding box are outside the view,
   *   update the zoom so that the view encompasses the bounding box.
   *
   * Animating that is tricky because it requires zooming around a point
   * intermediate of the current center and the desired center.
   */
  const panToNodes = useCallback(
    (nodeIds: string[]) => {
      const cy = cyRef.current;
      if (!cy) return;

      const nodes = cy.nodes().filter((node) => nodeIds.includes(node.id()));
      if (nodes.length === 0) return;

      const nodesBoundingBox = nodes.boundingBox();
      const padding = 50;

      const extent = cy.extent();
      const viewIncludesNodes =
        nodesBoundingBox.x1 - padding >= extent.x1 &&
        nodesBoundingBox.x2 + padding <= extent.x2 &&
        nodesBoundingBox.y1 - padding >= extent.y1 &&
        nodesBoundingBox.y2 + padding <= extent.y2;

      if (!viewIncludesNodes) {
        cy.animate({ center: { eles: nodes }, duration: 300 });
      }
    },
    [cyRef],
  );

  useEffect(() => {
    if (focusedNodeIds.length) {
      panToNodes(focusedNodeIds);
    }
  }, [focusedNodeIds, panToNodes]);
}
