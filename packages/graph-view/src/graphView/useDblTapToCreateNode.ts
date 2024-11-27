import { MutableRefObject } from "react";
import cytoscape, { EventObject } from "cytoscape";
import { useEffect } from "react";

import "./GraphView.scss";

export interface OnAddNewProposition {
  (): void;
}

export function useDblTapToCreateNode(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onAddNewProposition: OnAddNewProposition | undefined,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    const dbltapHandler = (event: EventObject) => {
      if (event.target === cy) {
        onAddNewProposition?.();
      }
    };
    cy.on("dbltap", dbltapHandler);
    return () => {
      cy.off("dbltap", dbltapHandler);
    };
  });
}
