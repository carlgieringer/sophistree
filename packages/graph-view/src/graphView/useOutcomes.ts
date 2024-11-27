import { MutableRefObject } from "react";
import cytoscape, { SingularElementArgument } from "cytoscape";
import { useEffect } from "react";

import "./GraphView.scss";
import {
  BasisOutcome,
  JustificationOutcome,
  outcomeValence,
} from "@sophistree/common";
import { getEntityId } from "./entityIds";

export interface Outcomes {
  basisOutcomes: Map<string, BasisOutcome>;
  justificationOutcomes: Map<string, JustificationOutcome>;
}

export const nodeOutcomeClasses = [
  "node-outcome-positive",
  "node-outcome-negative",
  "node-outcome-neutral",
  "node-outcome-contradictory",
];
const edgeOutcomeClasses = [
  "edge-outcome-positive",
  "edge-outcome-negative",
  "edge-outcome-neutral",
];
export const outcomeClasses = [...nodeOutcomeClasses, ...edgeOutcomeClasses];

export function useOutcomes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  { basisOutcomes, justificationOutcomes }: Outcomes,
) {
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.elements()
      .removeClass(outcomeClasses)
      .data({ outcome: undefined, valence: undefined });

    const elementsByEntityId = cy.elements().reduce((acc, element) => {
      const entityId = getEntityId(element);
      if (!entityId) {
        return acc;
      }
      const elements = acc.get(entityId) ?? [];
      elements.push(element);
      acc.set(entityId, elements);
      return acc;
    }, new Map<string, SingularElementArgument[]>());

    [basisOutcomes, justificationOutcomes].forEach((outcomes) => {
      outcomes.forEach((outcome, entityId) => {
        const elements = elementsByEntityId.get(entityId);
        if (!elements) {
          return;
        }

        const { nodeClass, edgeClass, valence } = makeOutcomeClasses(outcome);
        elements.forEach((element) => {
          element.data("outcome", outcome);
          element.data("valence", valence);
          if (element.isNode()) {
            element.addClass(nodeClass);
          } else {
            element.addClass(edgeClass);
          }
        });
      });
    });
  }, [cyRef, basisOutcomes, justificationOutcomes]);
}

function makeOutcomeClasses(outcome: BasisOutcome | JustificationOutcome) {
  const valence = outcomeValence(outcome);
  const nodeClass = `node-outcome-${valence}`;
  const edgeClass = `edge-outcome-${valence}`;
  return { nodeClass, edgeClass, valence };
}
