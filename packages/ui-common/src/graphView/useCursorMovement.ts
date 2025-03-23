import cytoscape, { Position } from "cytoscape";
import { MutableRefObject, useEffect } from "react";

export function useCursorMovement(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onCursorMove: ((position: Position) => void) | undefined,
) {
  useEffect(() => {
    if (cyRef.current && onCursorMove) {
      const cy = cyRef.current;

      const onMouseMove = (event: cytoscape.EventObjectCore) => {
        if (event.type === "mousemove") {
          const pos = event.position;
          onCursorMove({
            x: pos.x,
            y: pos.y,
          });
        }
      };

      cy.on("mousemove", onMouseMove);

      return () => {
        cy.off("mousemove", onMouseMove);
      };
    }
  }, [cyRef, onCursorMove]);
}
