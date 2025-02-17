import { BasisOutcome, outcomeValence } from "@sophistree/common";

export function getOutcomeColorStyle(outcome: BasisOutcome) {
  const valence = outcomeValence(outcome);
  switch (valence) {
    case "positive":
      return { color: "rgb(44, 109, 44)" };
    case "negative":
      return { color: "rgb(139, 64, 55)" };
    case "contradictory":
      return {
        background: `linear-gradient(
          to right,
          rgb(44, 109, 44) 0%,
          rgb(139, 64, 55) 100%
        )`,
      };
    case "neutral":
      return {};
  }
}
