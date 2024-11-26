import { BasisOutcome } from "@sophistree/common";

import { combineAppearanceOutcomes } from "./selectors";

describe("combineAppearanceOutcomes", () => {
  const allOutcomes: BasisOutcome[] = [
    "Unproven",
    "Presumed",
    "Proven",
    "Disproven",
    "Contradictory",
  ];

  test.each(allOutcomes)(
    "Contradictory + %s should always be Contradictory",
    (outcome) => {
      expect(combineAppearanceOutcomes("Contradictory", outcome)).toBe(
        "Contradictory",
      );
      expect(combineAppearanceOutcomes(outcome, "Contradictory")).toBe(
        "Contradictory",
      );
    },
  );

  test.each(allOutcomes)("Unproven + %s should always be %s", (outcome) => {
    expect(combineAppearanceOutcomes("Unproven", outcome)).toBe(outcome);
    expect(combineAppearanceOutcomes(outcome, "Unproven")).toBe(outcome);
  });

  test.each(["Presumed", "Proven", "Contradictory"])(
    "Disproven + %s should be Contradictory",
    (outcome) => {
      expect(
        combineAppearanceOutcomes("Disproven", outcome as BasisOutcome),
      ).toBe("Contradictory");
      expect(
        combineAppearanceOutcomes(outcome as BasisOutcome, "Disproven"),
      ).toBe("Contradictory");
    },
  );

  test("Disproven + Unproven should be Disproven", () => {
    expect(combineAppearanceOutcomes("Disproven", "Unproven")).toBe(
      "Disproven",
    );
    expect(combineAppearanceOutcomes("Unproven", "Disproven")).toBe(
      "Disproven",
    );
  });

  test("Proven + Presumed should be Proven", () => {
    expect(combineAppearanceOutcomes("Proven", "Presumed")).toBe("Proven");
    expect(combineAppearanceOutcomes("Presumed", "Proven")).toBe("Proven");
  });

  test("Presumed + Presumed should be Presumed", () => {
    expect(combineAppearanceOutcomes("Presumed", "Presumed")).toBe("Presumed");
  });

  test("Proven + Proven should be Proven", () => {
    expect(combineAppearanceOutcomes("Proven", "Proven")).toBe("Proven");
  });

  test("Disproven + Disproven should be Disproven", () => {
    expect(combineAppearanceOutcomes("Disproven", "Disproven")).toBe(
      "Disproven",
    );
  });

  test("Unproven + Unproven should be Unproven", () => {
    expect(combineAppearanceOutcomes("Unproven", "Unproven")).toBe("Unproven");
  });
});
