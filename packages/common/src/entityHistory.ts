import type {
  Polarity,
  Proposition,
  MediaExcerpt,
  PropositionCompound,
  Justification,
} from "entities";

export interface ArgumentMapHistoryEntry {
  actorId: string;
  /** Automerge Heads/Hash[] */
  heads: string[] | undefined;
  timestamp: string;
  changes: ArgumentMapHistoryChange[];
}

export type ArgumentMapHistoryChange =
  | {
      type: "BeginHistory";
    }
  | {
      type: "ResetHistory";
    }
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
  | ({
      type: "AddMediaExcerpt";
    } & MediaExcerptHistoryInfoFields)
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
  | ({
      type: "RemoveMediaExcerpt";
    } & MediaExcerptHistoryInfoFields)
  | ({
      type: "AddJustification";
    } & JustificationHistoryInfoFields)
  | ({
      type: "ModifyJustification";
      oldPolarity: Polarity;
    } & JustificationHistoryInfoFields)
  | ({
      type: "RemoveJustification";
    } & JustificationHistoryInfoFields)
  | ({
      type: "AddAppearance";
    } & AppearanceHistoryInfoFields)
  | ({
      type: "RemoveAppearance";
    } & AppearanceHistoryInfoFields)
  | ({
      type: "ModifyPropositionCompoundAtoms";
    } & PropositionCompoundHistoryInfoFields);

export type PropositionHistoryInfoFields = Pick<Proposition, "id" | "text">;
export type PropositionHistoryInfo = Pick<Proposition, "type"> &
  PropositionHistoryInfoFields;
export type MediaExcerptHistoryInfo = Pick<MediaExcerpt, "type"> &
  MediaExcerptHistoryInfoFields;
export type MediaExcerptHistoryInfoFields = Pick<
  MediaExcerpt,
  "id" | "quotation" | "sourceInfo" | "urlInfo" | "domAnchor"
>;
export interface PropositionCompoundHistoryInfoFields {
  id: string;
  atoms: PropositionCompoundAtomModificationInfo[];
}
export type PropositionCompoundHistoryInfo = Pick<PropositionCompound, "type"> &
  PropositionCompoundHistoryInfoFields;

export interface AppearanceHistoryInfoFields {
  id: string;
  mediaExcerptId: string;
  mediaExcerpt: MediaExcerptHistoryInfo;
  apparitionId: string;
  apparitionInfo: PropositionHistoryInfo;
}

interface JustificationHistoryInfoFields {
  id: string;
  basisId: string;
  basisInfo: JustificationBasisHistoryInfo;
  targetId: string;
  targetInfo: JustificationTargetHistoryInfo;
  polarity: Polarity;
}
type JustificationHistoryInfo = Pick<Justification, "type"> &
  JustificationHistoryInfoFields;

export type JustificationBasisHistoryInfo =
  | PropositionCompoundHistoryInfo
  | MediaExcerptHistoryInfo;

export type JustificationTargetHistoryInfo =
  | PropositionHistoryInfo
  | JustificationHistoryInfo;

export type HistoryInfo =
  | PropositionHistoryInfo
  | MediaExcerptHistoryInfo
  | JustificationHistoryInfo
  | PropositionCompoundHistoryInfo
  | AppearanceHistoryInfoFields;

type PropositionCompoundAtomModificationInfo = PropositionHistoryInfo & {
  modificationType: PropositionCompoundAtomModificationType;
};

type PropositionCompoundAtomModificationType =
  | "Added"
  | "Removed"
  | "Unchanged";
