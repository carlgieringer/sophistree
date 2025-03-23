import { MutableRefObject, useCallback } from "react";
import cytoscape, { Position } from "cytoscape";
import { CollaborativePresenceState } from "../presence";
import { modelToRenderedPosition } from "../presence/coordinateUtils";

export function useNavigateToUser(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  presenceState?: CollaborativePresenceState,
) {
  const navigateToPosition = useCallback(
    (position: Position) => {
      if (!cyRef.current) return;

      const cy = cyRef.current;
      const container = cy.container();
      if (!container) return;

      const width = container.offsetWidth;
      const height = container.offsetHeight;

      // Get rendered position using utility
      const renderedPosition = modelToRenderedPosition(position, cyRef);

      // Center the viewport on the rendered position
      cy.pan({
        x: width / 2 - renderedPosition.x,
        y: height / 2 - renderedPosition.y,
      });
      cy.zoom(1);
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
