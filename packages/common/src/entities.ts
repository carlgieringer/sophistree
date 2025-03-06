import { DomAnchor } from "tapestry-highlights";

import { BasisOutcome } from "./outcomes";

interface BaseEntity {
  id: string;
  // if explicitVisibility is missing, falls back to autoVisibility
  explicitVisibility?: Visibility | undefined;
  autoVisibility: Visibility;
  isCollapsed?: boolean;
}

export type Visibility = "Visible" | "Hidden";

export type Entity =
  | Proposition
  | PropositionCompound
  | Justification
  | MediaExcerpt
  | Appearance;

export type EntityType = Entity["type"];

export interface Proposition extends BaseEntity {
  type: "Proposition";
  text: string;
}

export interface PropositionCompound extends BaseEntity {
  type: "PropositionCompound";
  atomIds: string[];
}

export type Polarity = "Positive" | "Negative";

export interface Justification extends BaseEntity {
  type: "Justification";
  basisId: string;
  targetId: string;
  polarity: Polarity;
}

export type MediaExcerpt = BaseEntity & {
  type: "MediaExcerpt";
  quotation: string;
  urlInfo: UrlInfo;
  sourceInfo: SourceInfo;
  domAnchor: DomAnchor;
};

export interface UrlInfo {
  url: string;
  canonicalUrl?: string;
  pdfFingerprint?: string;
}

interface SourceInfo {
  name: string;
}

export interface Appearance extends BaseEntity {
  type: "Appearance";
  apparitionId: string;
  mediaExcerptId: string;
}

/**
 * Conclusions are any roots of justification trees in the map. To count as a
 * conclusion, a proposition must be the target of at least one justification,
 * and it must not be the basis of any justification.
 *
 * A ConclusionInfo must have at least one propositionId. It can have multiple
 * if all those propositions have the same source names and URLs. Ideally
 * Conclusions' propositionIds are combined into the fewest ConclusionInfos for
 * streamlined display.
 */
export interface ConclusionInfo {
  propositionInfos: PropositionInfo[];
  appearanceInfo: {
    /** The distinct sourceInfo.names for appearances of the propositions.  */
    sourceNames: string[];
    /** The distinct domains for appearances of the propositions. */
    domains: string[];
  };
  mediaExcerptJustificationInfo: {
    /** The distinct sourceInfo.names for all MediaExcerpts that are the basis of Justifications under
     *  the propositions.  */
    sourceNames: string[];
    /** The distinct domains for all MediaExcerpts that are the basis of Justifications under
     *  the propositions.  */
    domains: string[];
  };
}

export interface PropositionInfo {
  propositionId: string;
  outcome: BasisOutcome;
}

export interface ArgumentMap {
  id: string;
  // The data format version. If missing, implied to be minAutomergeMapVersion.
  version?: number;
  automergeDocumentId: string;
  name: string;
  entities: Entity[];
  /** Conclusions summarize the main points of the argument. See ConclusionInfo. */
  conclusions: ConclusionInfo[];
  /**
   * Some sources (especially PDFs) have poor names. We track what the user
   * last override MediaExcerpt sources to be, and automatically apply them
   * when new MediaExcerpts are created for the same URL. (We store overrides
   * for both the canonical and plain URL, preferring the override matching the
   * URL.)
   */
  sourceNameOverrides: Record<string, string>;
  history: ArgumentMapHistoryEntry[];
}

interface ArgumentMapHistoryEntry {
  actorId: string;
  timestamp: string;
  changes: ArgumentMapHistoryChange[];
}

export type ArgumentMapHistoryChange =
  | {
      type: "CreateMap";
      name: string;
    }
  | {
      type: "RenameMap";
      oldName: string;
      newName: string;
    }
  | {
      type: "StartRemoteSync";
      syncServerAddresses: string[];
    }
  | {
      type: "EndRemoteSync";
    }
  | {
      type: "AddProposition";
      id: string;
      text: string;
    }
  | {
      type: "ModifyProposition";
      id: string;
      before: {
        text: string;
      };
      after: {
        text: string;
      };
    }
  | {
      type: "RemoveProposition";
      id: string;
      text: string;
    }
  | {
      type: "AddMediaExcerpt";
      id: string;
      quotation: string;
      sourceName: string;
      url: string;
    }
  | {
      type: "ModifyMediaExcerpt";
      id: string;
      before: {
        sourceName: string;
      };
      after: {
        sourceName: string;
      };
    }
  | {
      type: "RemoveMediaExcerpt";
      id: string;
      quotation: string;
      sourceName: string;
      url: string;
    }
  | {
      type: "AddJustification";
      id: string;
      basisId: string;
      targetId: string;
      polarity: Polarity;
    }
  | {
      type: "ModifyJustification";
      id: string;
      before: {
        polarity: Polarity;
      };
      after: {
        polarity: Polarity;
      };
    }
  | {
      type: "RemoveJustification";
      id: string;
      basisId: string;
      targetId: string;
      polarity: Polarity;
    }
  | {
      type: "AddAppearance";
      id: string;
      mediaExcerptId: string;
      apparitionId: string;
    }
  | {
      type: "ModifyAppearance";
      id: string;
      before: {
        mediaExcerptId: string;
        apparitionId: string;
      };
      after: {
        mediaExcerptId: string;
        apparitionId: string;
      };
    }
  | {
      type: "RemoveAppearance";
      id: string;
      apparitionId: string;
      mediaExcerptId: string;
    }
  | {
      type: "AddPropositionCompoundAtom";
      compoundId: string;
      atomId: string;
    };
