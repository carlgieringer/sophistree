import { MutableRefObject } from "react";
import cytoscape from "cytoscape";
import { useEffect } from "react";

import { getEntityId } from "./entityIds";

export interface OnSelectEntities {
  (entityIds: string[]): void;
}

export function useSelectionHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onSelectEntities: OnSelectEntities,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    const onSelectionChange = () => {
      const ids = cy.elements().filter(":selected").map(getEntityId);
      onSelectEntities(ids);
    };
    cy.on("select unselect", "node,edge", onSelectionChange);
    return () => {
      cy.off("select unselect", "node,edge", onSelectionChange);
    };
  }, [cyRef, onSelectEntities]);
}
