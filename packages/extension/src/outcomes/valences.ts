import { BasisOutcome, JustificationOutcome } from "./outcomes";

export type OutcomeValence =
  | "positive"
  | "negative"
  | "neutral"
  | "contradictory";

export function outcomeValence(
  outcome: BasisOutcome | JustificationOutcome,
): OutcomeValence {
  switch (outcome) {
    case "Presumed":
    case "Proven":
    case "Valid":
      return "positive";
    case "Disproven":
    case "Invalid":
      return "negative";
    case "Unknown":
    case "Unproven":
      return "neutral";
    case "Contradictory":
      return "contradictory";
  }
}
