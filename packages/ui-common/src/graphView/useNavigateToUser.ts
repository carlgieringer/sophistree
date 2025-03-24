import { MutableRefObject, useCallback } from "react";
import cytoscape, { Position } from "cytoscape";
import { CollaborativePresenceState } from "../presence";

export function useNavigateToUser(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  presenceState?: CollaborativePresenceState,
) {
  const navigateToPosition = useCallback(
    ({ x, y }: Position) => {
      const cy = cyRef.current;
      if (!cy) {
        return;
      }
      const { x1, y1, w, h } = cy.extent();
      const deltaX = x - w / 2 - x1;
      const deltaY = y - h / 2 - y1;
      const zoom = cy.zoom();
      cy.animate({ panBy: { x: -deltaX * zoom, y: -deltaY * zoom } });
    },
    [cyRef],
  );

  return useCallback(
    (deviceId: string) => {
      if (!presenceState) return;

      const presence = presenceState.presenceByDeviceId[deviceId];
      if (presence?.cursorPosition) {
        navigateToPosition(presence.cursorPosition);
      }
    },
    [presenceState, navigateToPosition],
  );
}
