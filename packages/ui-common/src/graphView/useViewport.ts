import { MutableRefObject, useEffect, useState } from "react";
import cytoscape from "cytoscape";

export function useViewport(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
) {
  const [viewport, setViewport] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>();

  useEffect(() => {
    if (cyRef.current) {
      const updateViewport = () => {
        const extent = cyRef.current?.extent();
        if (extent) {
          setViewport(extent);
        }
      };

      const cy = cyRef.current;
      cy.on("viewport", updateViewport);
      updateViewport();

      return () => {
        cy?.off("viewport", updateViewport);
      };
    }
  }, [cyRef]);

  return viewport;
}
