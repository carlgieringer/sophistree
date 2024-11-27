import { MutableRefObject } from "react";
import cytoscape, { EventObject, EventObjectNode } from "cytoscape";
import { useEffect } from "react";

import "./GraphView.scss";
import { getEntityId } from "./entityIds";

export interface OnSelectEntities {
  (entityIds: string[]): void;
}

export interface OnResetSelection {
  (): void;
}

export function useSelectionHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onSelectEntities: OnSelectEntities,
  onResetSelection: OnResetSelection,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    const tapNodeHandler = (event: EventObjectNode) => {
      const entityId = getEntityId(event.target);
      onSelectEntities([entityId]);
    };
    cy.on("tap", "node", tapNodeHandler);

    const tapEdgeHandler = (event: EventObjectNode) => {
      const entityId = getEntityId(event.target);
      onSelectEntities([entityId]);
    };
    cy.on("tap", "edge", tapEdgeHandler);

    const tapHandler = (event: EventObject) => {
      if (event.target === cy) {
        onResetSelection();
      }
    };
    cy.on("tap", tapHandler);
    return () => {
      cy.off("tap", "node", tapNodeHandler);
      cy.off("tap", "edge", tapEdgeHandler);
      cy.off("tap", tapHandler);
    };
  });
}
