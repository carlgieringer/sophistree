import { updateConclusions } from "./conclusions";
import {
  ArgumentMap,
  MediaExcerpt,
  Appearance,
  Justification,
  Proposition,
  PropositionCompound,
  Entity,
  ConclusionInfo,
} from "@sophistree/common";

// Mock Automerge's insertAt function
jest.mock("@automerge/automerge/next", () => ({
  insertAt: <T>(array: T[], index: number, ...items: T[]) => {
    array.splice(index, 0, ...items);
  },
}));

describe("updateConclusions", () => {
  test("should exclude propositions that are compound atoms", () => {
    const mediaExcerpt = createMediaExcerpt("m1");
    const atom1 = createProposition("p1");
    const atom2 = createProposition("p2");
    const conclusion = createProposition("p3");
    const compound = createPropositionCompound("pc1", [atom1.id, atom2.id]);
    const appearance = createAppearance("a1", mediaExcerpt.id, conclusion.id);
    const justification = createJustification("j1", compound.id, conclusion.id);

    const map = createMockArgumentMap([
      mediaExcerpt,
      atom1,
      atom2,
      conclusion,
      compound,
      appearance,
      justification,
    ]);
    updateConclusions(map);

    expect(map.conclusions).toHaveLength(1);
    const conclusionIds = map.conclusions[0].propositionInfos.map(
      (info) => info.propositionId,
    );
    expect(conclusionIds).toContain(conclusion.id);
    expect(conclusionIds).not.toContain(atom1.id);
    expect(conclusionIds).not.toContain(atom2.id);
  });

  test("should group conclusions by source names and URLs", () => {
    const mediaExcerpt1 = createMediaExcerpt("m1");
    const mediaExcerpt2 = createMediaExcerpt("m2");
    const atom1 = createProposition("b1");
    const atom2 = createProposition("b2");
    const proposition1 = createProposition("p1");
    const proposition2 = createProposition("p2");
    const compound1 = createPropositionCompound("pc1", [atom1.id]);
    const compound2 = createPropositionCompound("pc2", [atom2.id]);
    const appearance1 = createAppearance(
      "a1",
      mediaExcerpt1.id,
      proposition1.id,
    );
    const appearance2 = createAppearance(
      "a2",
      mediaExcerpt2.id,
      proposition2.id,
    );
    const justification1 = createJustification(
      "j1",
      compound1.id,
      proposition1.id,
    );
    const justification2 = createJustification(
      "j2",
      compound2.id,
      proposition2.id,
    );

    const map = createMockArgumentMap([
      mediaExcerpt1,
      mediaExcerpt2,
      atom1,
      atom2,
      proposition1,
      proposition2,
      compound1,
      compound2,
      appearance1,
      appearance2,
      justification1,
      justification2,
    ]);
    updateConclusions(map);

    expect(map.conclusions).toHaveLength(2);
    map.conclusions.forEach((conclusion) => {
      expect(conclusion.appearanceInfo.sourceNames).toHaveLength(1);
      expect(conclusion.appearanceInfo.domains).toHaveLength(1);
    });
  });

  test("should maintain sorted order of conclusions", () => {
    const mediaExcerpt1 = createMediaExcerpt("m1");
    const mediaExcerpt2 = createMediaExcerpt("m2");
    const atom1 = createProposition("b1");
    const atom2 = createProposition("b2");
    const proposition1 = createProposition("p1");
    const proposition2 = createProposition("p2");
    const compound1 = createPropositionCompound("pc1", [atom1.id]);
    const compound2 = createPropositionCompound("pc2", [atom2.id]);
    const appearance1 = createAppearance(
      "a1",
      mediaExcerpt1.id,
      proposition1.id,
    );
    const appearance2 = createAppearance(
      "a2",
      mediaExcerpt2.id,
      proposition2.id,
    );
    const justification1 = createJustification(
      "j1",
      compound1.id,
      proposition1.id,
    );
    const justification2 = createJustification(
      "j2",
      compound2.id,
      proposition2.id,
    );

    const map = createMockArgumentMap([
      mediaExcerpt2,
      mediaExcerpt1,
      atom2,
      atom1,
      proposition2,
      proposition1,
      compound2,
      compound1,
      appearance2,
      appearance1,
      justification2,
      justification1,
    ]);
    updateConclusions(map);

    // Verify conclusions are sorted by source names
    const sourceNames = map.conclusions.map(
      (c) => c.appearanceInfo.sourceNames[0],
    );
    expect(sourceNames).toEqual([...sourceNames].sort());
  });

  test("should correctly populate mediaExcerptJustificationInfo", () => {
    // Media excerpt that directly justifies a conclusion
    const mediaExcerpt1 = createMediaExcerpt("m1");
    const conclusion1 = createProposition("p1");
    const justification1 = createJustification(
      "j1",
      mediaExcerpt1.id,
      conclusion1.id,
    );

    // Media excerpt that justifies through a compound
    const mediaExcerpt2 = createMediaExcerpt("m2");
    const atom = createProposition("a1");
    const justification2 = createJustification("j2", mediaExcerpt2.id, atom.id);
    const compound = createPropositionCompound("pc1", [atom.id]);
    const conclusion2 = createProposition("p2");
    const justification3 = createJustification(
      "j3",
      compound.id,
      conclusion2.id,
    );

    const map = createMockArgumentMap([
      mediaExcerpt1,
      mediaExcerpt2,
      conclusion1,
      conclusion2,
      atom,
      compound,
      justification1,
      justification2,
      justification3,
    ]);
    updateConclusions(map);

    expect(map.conclusions).toHaveLength(1);

    // Check direct justification
    const conclusion1Info = map.conclusions[0];
    expect(
      conclusion1Info?.mediaExcerptJustificationInfo.sourceNames,
    ).toContain(`Source m1`);
    expect(conclusion1Info?.mediaExcerptJustificationInfo.domains).toContain(
      `example.com`,
    );

    // Check compound justification
    const conclusion2Info = map.conclusions.find((c) =>
      c.propositionInfos.some((p) => p.propositionId === conclusion2.id),
    );
    expect(
      conclusion2Info?.mediaExcerptJustificationInfo.sourceNames,
    ).toContain(`Source m2`);
  });
});

function createMediaExcerpt(id: string): MediaExcerpt {
  return {
    type: "MediaExcerpt",
    id,
    autoVisibility: "Visible",
    sourceInfo: {
      name: `Source ${id}`,
    },
    urlInfo: {
      url: `https://example.com/${id}`,
    },
    quotation: `Quote ${id}`,
    domAnchor: { text: { exact: `Quote ${id}` } },
  };
}

function createAppearance(
  id: string,
  mediaExcerptId: string,
  apparitionId: string,
): Appearance {
  return {
    type: "Appearance",
    id,
    autoVisibility: "Visible",
    mediaExcerptId,
    apparitionId,
  };
}

function createProposition(id: string): Proposition {
  return {
    type: "Proposition",
    id,
    autoVisibility: "Visible",
    text: `Proposition ${id}`,
  };
}

function createJustification(
  id: string,
  basisId: string,
  targetId: string,
): Justification {
  return {
    type: "Justification",
    id,
    autoVisibility: "Visible",
    basisId,
    targetId,
    polarity: "Positive",
  };
}

function createPropositionCompound(
  id: string,
  atomIds: string[],
): PropositionCompound {
  return {
    type: "PropositionCompound",
    id,
    autoVisibility: "Visible",
    atomIds,
  };
}

function createMockArgumentMap(entities: Entity[]): ArgumentMap {
  return {
    id: "test-map",
    automergeDocumentId: "test-doc",
    name: "Test Map",
    entities,
    conclusions: [] as ConclusionInfo[], // Use regular array instead of Automerge proxy
    sourceNameOverrides: {},
    history: [],
  };
}
