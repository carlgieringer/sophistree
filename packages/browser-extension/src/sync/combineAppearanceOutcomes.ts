import { BasisOutcome } from "@sophistree/common";

export function combineAppearanceOutcomes(
  outcome1: BasisOutcome,
  outcome2: BasisOutcome,
): BasisOutcome {
  if (outcome1 === "Contradictory" || outcome2 === "Contradictory") {
    return "Contradictory";
  }
  if (outcome1 === "Unproven" && outcome2 !== "Unproven") {
    return outcome2;
  }
  if (outcome1 !== "Unproven" && outcome2 === "Unproven") {
    return outcome1;
  }
  if (outcome1 === "Disproven" && outcome2 === "Disproven") {
    return "Disproven";
  }
  if (outcome1 === "Disproven" || outcome2 === "Disproven") {
    return "Contradictory";
  }
  if (outcome1 === "Proven" || outcome2 === "Proven") {
    return "Proven";
  }
  if (outcome1 === "Presumed" || outcome2 === "Presumed") {
    return "Presumed";
  }
  return outcome1;
}
