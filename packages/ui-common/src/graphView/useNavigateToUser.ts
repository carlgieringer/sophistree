import { MutableRefObject, useCallback } from "react";
import cytoscape, { Position } from "cytoscape";
import { CollaborativePresenceState } from "../presence";

export function useNavigateToUser(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  presenceState?: CollaborativePresenceState,
) {
  const navigateToPosition = useCallback(
    (position: Position) => {
      if (!cyRef.current) return;

      const cy = cyRef.current;
      // Convert position to rendered position
      const zoom = cy.zoom();
      const pan = cy.pan();
      const renderedX = position.x * zoom + pan.x;
      const renderedY = position.y * zoom + pan.y;

      const container = cy.container();
      if (!container) return;

      const width = container.offsetWidth;
      const height = container.offsetHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      cy.pan({
        x: centerX - renderedX,
        y: centerY - renderedY,
      });
      cy.zoom(1);
    },
    [cyRef],
  );

  return useCallback(
    (actorId: string) => {
      if (!presenceState) return;

      const presence = presenceState.presenceByActorId[actorId];
      if (presence?.cursorPosition) {
        navigateToPosition(presence.cursorPosition);
      }
    },
    [presenceState, navigateToPosition],
  );
}
