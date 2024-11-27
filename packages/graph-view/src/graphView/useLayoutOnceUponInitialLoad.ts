import cytoscape from "cytoscape";
import { useCallback, useEffect } from "react";

import "./GraphView.scss";

export function useLayoutOnceUponInitialLoad(
  cyRef: React.MutableRefObject<cytoscape.Core | undefined>,
  layoutGraph: (fit?: boolean) => void,
) {
  // Fit the graph once on load
  const initialFit = useCallback(() => {
    layoutGraph(true);
    cyRef.current?.off("layoutstop", initialFit);
  }, [cyRef, layoutGraph]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.on("layoutstop", initialFit);

    return () => {
      cy.off("layoutstop", initialFit);
    };
  }, [cyRef, initialFit]);
}
