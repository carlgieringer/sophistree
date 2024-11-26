import { determineOutcomes } from "./outcomes";
import {
  Entity,
  Justification,
  Proposition,
  PropositionCompound,
  MediaExcerpt,
  Appearance,
} from "../entities";

describe("determineOutcomes", () => {
  const defaultProps = { autoVisibility: "Visible" as const };

  const createMediaExcerpt = (id: string): MediaExcerpt => ({
    id,
    type: "MediaExcerpt",
    quotation: "",
    urlInfo: { url: "" },
    sourceInfo: { name: "" },
    domAnchor: {
      text: { prefix: "prefix", exact: "exact", suffix: "suffix" },
    },
    ...defaultProps,
  });

  const createProposition = (id: string): Proposition => ({
    id,
    type: "Proposition",
    text: "",
    ...defaultProps,
  });

  const createJustification = (
    id: string,
    basisId: string,
    targetId: string,
    polarity: "Positive" | "Negative",
  ): Justification => ({
    id,
    type: "Justification",
    basisId,
    targetId,
    polarity,
    ...defaultProps,
  });

  const createPropositionCompound = (
    id: string,
    atomIds: string[],
  ): PropositionCompound => ({
    id,
    type: "PropositionCompound",
    atomIds,
    ...defaultProps,
  });

  const createAppearance = (
    id: string,
    apparitionId: string,
    mediaExcerptId: string,
  ): Appearance => ({
    id,
    type: "Appearance",
    apparitionId,
    mediaExcerptId,
    ...defaultProps,
  });

  test("MediaExcerpt is always Presumed", () => {
    const entities: Entity[] = [createMediaExcerpt("m1")];
    const { basisOutcomes } = determineOutcomes(entities);
    expect(basisOutcomes.get("m1")).toBe("Presumed");
  });

  test("Proposition with no justifications or appearances is Presumed", () => {
    const entities: Entity[] = [createProposition("p1")];
    const { basisOutcomes } = determineOutcomes(entities);
    expect(basisOutcomes.get("p1")).toBe("Presumed");
  });

  test("Proposition with appearances but no justifications is Unproven", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createMediaExcerpt("m1"),
      createAppearance("a1", "p1", "m1"),
    ];
    const { basisOutcomes } = determineOutcomes(entities);
    expect(basisOutcomes.get("p1")).toBe("Unproven");
  });

  test("Justification with Unproven basis is Unknown", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createMediaExcerpt("m1"),
      createAppearance("a1", "p1", "m1"),
      createProposition("p2"),
      createJustification("j1", "p1", "p2", "Positive"),
    ];
    const { justificationOutcomes } = determineOutcomes(entities);
    expect(justificationOutcomes.get("j1")).toBe("Unknown");
  });

  test("Proposition with all Valid Positive justifications is Proven", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createJustification("j1", "p2", "p1", "Positive"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(justificationOutcomes.get("j1")).toBe("Valid");
    expect(basisOutcomes.get("p1")).toBe("Proven");
  });

  test("Proposition with all Valid Negative justifications is Disproven", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createJustification("j1", "p2", "p1", "Negative"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(justificationOutcomes.get("j1")).toBe("Valid");
    expect(basisOutcomes.get("p1")).toBe("Disproven");
  });

  test("Proposition with mixed Valid Positive and Negative justifications is Contradictory", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createProposition("p3"),
      createJustification("j1", "p2", "p1", "Positive"),
      createJustification("j2", "p3", "p1", "Negative"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(justificationOutcomes.get("j1")).toBe("Valid");
    expect(justificationOutcomes.get("j2")).toBe("Valid");
    expect(basisOutcomes.get("p1")).toBe("Contradictory");
  });

  test("Justification is Valid if basis is Presumed or Proven and no Valid counter-justifications", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createJustification("j1", "p1", "p2", "Positive"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(justificationOutcomes.get("j1")).toBe("Valid");
    expect(basisOutcomes.get("p2")).toBe("Proven");
  });

  test("Justification is Invalid if basis is Unproven, Disproven, or Contradictory", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createProposition("p3"),
      createJustification("j1", "p1", "p2", "Negative"),
      createJustification("j2", "p2", "p3", "Positive"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(basisOutcomes.get("p1")).toBe("Presumed");
    expect(basisOutcomes.get("p2")).toBe("Disproven");
    expect(basisOutcomes.get("p3")).toBe("Unproven");
    expect(justificationOutcomes.get("j2")).toBe("Invalid");
  });

  test("Justification is Invalid if it has Valid counter-justifications", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createProposition("p3"),
      createJustification("j1", "p1", "p3", "Positive"),
      createJustification("j2", "p2", "j1", "Negative"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(justificationOutcomes.get("j1")).toBe("Invalid");
    expect(basisOutcomes.get("p3")).toBe("Unproven");
  });

  test("PropositionCompound is Proven if all atoms are Proven or Presumed", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createPropositionCompound("pc1", ["p1", "p2"]),
      createProposition("p3"),
      createJustification("j1", "p3", "p2", "Positive"),
    ];
    const { basisOutcomes } = determineOutcomes(entities);
    expect(basisOutcomes.get("p2")).toBe("Proven");
    expect(basisOutcomes.get("pc1")).toBe("Presumed");
  });

  test("PropositionCompound is Disproven if any atom is not Proven or Presumed", () => {
    const entities: Entity[] = [
      createProposition("p1"),
      createProposition("p2"),
      createProposition("p3"),
      createJustification("j1", "p3", "p2", "Negative"),
      createPropositionCompound("pc1", ["p1", "p2"]),
      createProposition("p4"),
      createJustification("j2", "pc1", "p4", "Positive"),
    ];
    const { basisOutcomes } = determineOutcomes(entities);
    expect(basisOutcomes.get("pc1")).toBe("Disproven");
    expect(basisOutcomes.get("p4")).toBe("Unproven");
  });

  test("Handles complex scenario with multiple entity types and relationships", () => {
    const entities: Entity[] = [
      createMediaExcerpt("m1"),
      createProposition("p1"),
      createAppearance("a1", "p1", "m1"),
      createProposition("p2"),
      createJustification("j1", "p1", "p2", "Positive"),
      createProposition("p3"),
      createJustification("j2", "p2", "p3", "Negative"),
      createPropositionCompound("pc1", ["p1", "p2"]),
      createProposition("p4"),
      createJustification("j3", "pc1", "p4", "Positive"),
    ];
    const { basisOutcomes, justificationOutcomes } =
      determineOutcomes(entities);
    expect(basisOutcomes.get("m1")).toBe("Presumed");
    expect(basisOutcomes.get("p1")).toBe("Unproven");
    expect(basisOutcomes.get("p2")).toBe("Unproven");
    expect(basisOutcomes.get("p3")).toBe("Unproven");
    expect(basisOutcomes.get("pc1")).toBe("Unproven");
    expect(basisOutcomes.get("p4")).toBe("Unproven");
    expect(justificationOutcomes.get("j1")).toBe("Unknown");
    expect(justificationOutcomes.get("j2")).toBe("Unknown");
    expect(justificationOutcomes.get("j3")).toBe("Unknown");
  });
});
