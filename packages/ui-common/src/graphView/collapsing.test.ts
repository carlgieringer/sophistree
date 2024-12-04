import {
  MediaExcerpt,
  Proposition,
  PropositionCompound,
} from "@sophistree/common";
import { getCollapseInfo } from "./collapsing";

describe("calculateCollapsedInfo", () => {
  describe("node visibility", () => {
    it("should hide nodes when parent is collapsed", () => {
      const parent: Proposition = {
        id: "parent",
        type: "Proposition",
        text: "parent",
        isCollapsed: true,
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const child: Proposition = {
        id: "child",
        type: "Proposition",
        text: "child",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const childCompound: PropositionCompound = {
        id: "childCompound",
        type: "PropositionCompound",
        atomIds: ["child"],
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const justification = {
        id: "j1",
        type: "Justification",
        basisId: "childCompound",
        targetId: "parent",
        polarity: "Positive",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      } as const;

      const entities = [justification, parent, child, childCompound];

      const { collapsedDescendantIds, collapsedDescendantCounts } =
        getCollapseInfo(entities);

      // Child and childCompound should be hidden
      expect(collapsedDescendantIds).toEqual(
        new Set(["child", "childCompound"]),
      );

      // Parent should have correct hidden counts
      expect(collapsedDescendantCounts.get("parent")).toEqual({
        childCount: 1,
        descendantCount: 1,
      });
    });

    it("should show nodes with multiple parents when one parent is not collapsed", () => {
      const collapsedParent: Proposition = {
        id: "parent1",
        type: "Proposition",
        text: "parent1",
        isCollapsed: true,
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const uncollapsedParent: Proposition = {
        id: "parent2",
        type: "Proposition",
        text: "parent2",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const child: Proposition = {
        id: "child",
        type: "Proposition",
        text: "child",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const childCompound: PropositionCompound = {
        id: "childCompound",
        type: "PropositionCompound",
        atomIds: ["child"],
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const justification1 = {
        id: "j1",
        type: "Justification",
        basisId: "childCompound",
        targetId: "parent1",
        polarity: "Positive",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      } as const;

      const justification2 = {
        id: "j2",
        type: "Justification",
        basisId: "childCompound",
        targetId: "parent2",
        polarity: "Positive",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      } as const;

      const entities = [
        justification1,
        justification2,
        collapsedParent,
        uncollapsedParent,
        child,
        childCompound,
      ];

      const { collapsedDescendantIds } = getCollapseInfo(entities);

      // Child and childCompound should be visible since they have an uncollapsed parent
      expect(collapsedDescendantIds).toEqual(new Set());
    });

    it("should respect explicitVisibility and autoVisibility settings", () => {
      const visibleNode: Proposition = {
        id: "visible",
        type: "Proposition",
        text: "visible",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const hiddenNode: Proposition = {
        id: "hidden",
        type: "Proposition",
        text: "hidden",
        explicitVisibility: "Hidden",
        autoVisibility: "Visible",
      };

      const autoHiddenNode: Proposition = {
        id: "autoHidden",
        type: "Proposition",
        text: "autoHidden",
        autoVisibility: "Hidden",
      };

      const entities = [visibleNode, hiddenNode, autoHiddenNode];

      const { collapsedDescendantIds } = getCollapseInfo(entities);

      // Only visible node should be visible
      expect(collapsedDescendantIds.has("visible")).toBe(false);
      expect(collapsedDescendantIds.has("hidden")).toBe(false); // Not in collapsedDescendantIds because it's not visible to begin with
      expect(collapsedDescendantIds.has("autoHidden")).toBe(false); // Not in collapsedDescendantIds because it's not visible to begin with
    });

    it("should calculate correct hidden counts for nested collapsed nodes", () => {
      const grandparent: Proposition = {
        id: "grandparent",
        type: "Proposition",
        text: "grandparent",
        isCollapsed: true,
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const parent: Proposition = {
        id: "parent",
        type: "Proposition",
        text: "parent",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const child1: Proposition = {
        id: "child1",
        type: "Proposition",
        text: "child1",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const child2: Proposition = {
        id: "child2",
        type: "Proposition",
        text: "child2",
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const parentCompound: PropositionCompound = {
        id: "parentCompound",
        type: "PropositionCompound",
        atomIds: ["parent"],
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const child1Compound: PropositionCompound = {
        id: "child1Compound",
        type: "PropositionCompound",
        atomIds: ["child1"],
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const child2Compound: PropositionCompound = {
        id: "child2Compound",
        type: "PropositionCompound",
        atomIds: ["child2"],
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const entities = [
        {
          id: "j1",
          type: "Justification",
          basisId: "parentCompound",
          targetId: "grandparent",
          polarity: "Positive",
          explicitVisibility: "Visible",
          autoVisibility: "Visible",
        } as const,
        {
          id: "j2",
          type: "Justification",
          basisId: "child1Compound",
          targetId: "parent",
          polarity: "Positive",
          explicitVisibility: "Visible",
          autoVisibility: "Visible",
        } as const,
        {
          id: "j3",
          type: "Justification",
          basisId: "child2Compound",
          targetId: "parent",
          polarity: "Positive",
          explicitVisibility: "Visible",
          autoVisibility: "Visible",
        } as const,
        grandparent,
        parent,
        child1,
        child2,
        parentCompound,
        child1Compound,
        child2Compound,
      ];

      const { collapsedDescendantIds, collapsedDescendantCounts } =
        getCollapseInfo(entities);

      // All descendants should be hidden
      expect(collapsedDescendantIds).toEqual(
        new Set([
          "child1",
          "child2",
          "child1Compound",
          "child2Compound",
          "parent",
          "parentCompound",
        ]),
      );

      // Grandparent should have correct hidden counts
      expect(collapsedDescendantCounts.get("grandparent")).toEqual({
        childCount: 1,
        descendantCount: 3,
      });
    });

    it("should handle media excerpts correctly", () => {
      const proposition: Proposition = {
        id: "prop",
        type: "Proposition",
        text: "proposition",
        isCollapsed: true,
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const mediaExcerpt: MediaExcerpt = {
        id: "media1",
        type: "MediaExcerpt",
        quotation: "test excerpt",
        urlInfo: {
          url: "test.pdf",
        },
        sourceInfo: {
          name: "Test Source",
        },
        domAnchor: {
          text: {
            start: 0,
            end: 11,
          },
        },
        explicitVisibility: "Visible",
        autoVisibility: "Visible",
      };

      const entities = [
        {
          id: "j1",
          type: "Justification",
          basisId: "media1",
          targetId: "prop",
          polarity: "Positive",
          explicitVisibility: "Visible",
          autoVisibility: "Visible",
        } as const,
        proposition,
        mediaExcerpt,
      ];

      const { collapsedDescendantIds, collapsedDescendantCounts } =
        getCollapseInfo(entities);

      // Media excerpt should be hidden
      expect(collapsedDescendantIds).toContain("media1");

      // Proposition should have correct hidden counts
      expect(collapsedDescendantCounts.get("prop")).toEqual({
        childCount: 1,
        descendantCount: 1,
      });
    });
  });
});
