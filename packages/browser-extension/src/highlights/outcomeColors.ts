import { BasisOutcome, outcomeValence } from "@sophistree/common";

export function getOutcomeColorClass(outcome: BasisOutcome | undefined) {
  if (!outcome) {
    return "highlight-color-default";
  }
  const valence = outcomeValence(outcome);
  return `highlight-color-${valence}`;
}
