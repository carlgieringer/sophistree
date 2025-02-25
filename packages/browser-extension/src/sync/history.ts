import {
  Polarity,
  Entity,
  Proposition,
  MediaExcerpt,
  Justification,
  Appearance,
  PropositionCompound,
} from "@sophistree/common";
import * as Automerge from "@automerge/automerge";
import { ArgumentMap } from "@sophistree/common";

export function formatHistory(doc: ArgumentMap): HistoryEntry[] {
  const history = Automerge.getHistory(doc);

  return history.map((change, index) => {
    const before = index > 0 ? history[index - 1].snapshot : undefined;
    const after = change.snapshot;

    return {
      timestamp: change.change.time,
      actor: change.change.actor,
      changes: getEntityChanges(before, after),
    };
  });
}

export type HistoryChange =
  | {
      type: "CreateMap";
      name: string;
    }
  | {
      type: "RenameMap";
      before: string;
      after: string;
    }
  | {
      type: "AddProposition";
      id: string;
      text: string;
    }
  | {
      type: "ModifyProposition";
      id: string;
      before: string;
      after: string;
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
      url: string;
      sourceName: string;
    }
  | {
      type: "ModifyMediaExcerpt";
      id: string;
      before: {
        quotation: string;
        url: string;
        sourceName: string;
      };
      after: {
        quotation: string;
        url: string;
        sourceName: string;
      };
    }
  | {
      type: "RemoveMediaExcerpt";
      id: string;
      quotation: string;
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
        basisId: string;
        targetId: string;
        polarity: Polarity;
      };
      after: {
        basisId: string;
        targetId: string;
        polarity: Polarity;
      };
    }
  | {
      type: "RemoveJustification";
      id: string;
      basisId: string;
      targetId: string;
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
      mediaExcerptId: string;
    }
  | {
      type: "AddPropositionCompoundAtom";
      compoundId: string;
      atomId: string;
    };

export interface HistoryEntry {
  timestamp: number;
  actor: string;
  changes: HistoryChange[];
}

function getEntityChanges(
  before: ArgumentMap | undefined,
  after: ArgumentMap,
): HistoryChange[] {
  const changes: HistoryChange[] = [];

  if (!before) {
    changes.push({
      type: "CreateMap",
      name: after.name,
    });
  } else if (before.name !== after.name) {
    changes.push({
      type: "RenameMap",
      before: before.name,
      after: after.name,
    });
  }

  addAddedEntityChanges(before, after, changes);

  if (before) {
    addRemovedEntityChanges(before, after, changes);
    addModifiedEntityChanges(before, after, changes);
  }

  return changes;
}

function addAddedEntityChanges(
  before: ArgumentMap | undefined,
  after: ArgumentMap,
  changes: HistoryChange[],
) {
  // Get sets of entity IDs for comparison
  const beforeEntities = new Set(before?.entities.map((e) => e.id) || []);

  // Handle added entities
  for (const entity of after.entities) {
    if (!beforeEntities.has(entity.id)) {
      switch (entity.type) {
        case "PropositionCompound":
          // Skip PropositionCompound additions as we only track atom additions
          break;
        case "Proposition": {
          changes.push({
            type: "AddProposition",
            id: entity.id,
            text: entity.text,
          });
          break;
        }
        case "MediaExcerpt": {
          changes.push({
            type: "AddMediaExcerpt",
            id: entity.id,
            quotation: entity.quotation,
            url: entity.urlInfo.url,
            sourceName: entity.sourceInfo.name,
          });
          break;
        }
        case "Justification": {
          changes.push({
            type: "AddJustification",
            id: entity.id,
            basisId: entity.basisId,
            targetId: entity.targetId,
            polarity: entity.polarity,
          });
          break;
        }
        case "Appearance": {
          changes.push({
            type: "AddAppearance",
            id: entity.id,
            mediaExcerptId: entity.mediaExcerptId,
            apparitionId: entity.apparitionId,
          });
          break;
        }
      }
    }
  }
}

function addRemovedEntityChanges(
  before: ArgumentMap,
  after: ArgumentMap,
  changes: HistoryChange[],
) {
  const afterEntities = new Set(after.entities.map((e) => e.id));
  for (const entity of before.entities) {
    if (!afterEntities.has(entity.id)) {
      switch (entity.type) {
        case "PropositionCompound":
          // Skip PropositionCompound removals as we only track atom additions
          break;
        case "Proposition": {
          changes.push({
            type: "RemoveProposition",
            id: entity.id,
            text: entity.text,
          });
          break;
        }
        case "MediaExcerpt": {
          changes.push({
            type: "RemoveMediaExcerpt",
            id: entity.id,
            quotation: entity.quotation,
          });
          break;
        }
        case "Justification": {
          changes.push({
            type: "RemoveJustification",
            id: entity.id,
            basisId: entity.basisId,
            targetId: entity.targetId,
          });
          break;
        }
        case "Appearance": {
          changes.push({
            type: "RemoveAppearance",
            id: entity.id,
            mediaExcerptId: entity.mediaExcerptId,
          });
          break;
        }
      }
    }
  }
}

function addModifiedEntityChanges(
  before: ArgumentMap,
  after: ArgumentMap,
  changes: HistoryChange[],
) {
  for (const afterEntity of after.entities) {
    const beforeEntity = before.entities.find((e) => e.id === afterEntity.id);
    if (beforeEntity && beforeEntity.type === afterEntity.type) {
      switch (beforeEntity.type) {
        case "PropositionCompound": {
          if (isPropositionCompound(afterEntity)) {
            const beforeAtoms = new Set(beforeEntity.atomIds);
            for (const atomId of afterEntity.atomIds) {
              if (!beforeAtoms.has(atomId)) {
                changes.push({
                  type: "AddPropositionCompoundAtom",
                  compoundId: afterEntity.id,
                  atomId,
                });
              }
            }
          }
          break;
        }
        case "Proposition": {
          if (isProposition(beforeEntity) && isProposition(afterEntity)) {
            if (beforeEntity.text !== afterEntity.text) {
              changes.push({
                type: "ModifyProposition",
                id: afterEntity.id,
                before: beforeEntity.text,
                after: afterEntity.text,
              });
            }
          }
          break;
        }
        case "MediaExcerpt": {
          if (isMediaExcerpt(afterEntity)) {
            if (
              beforeEntity.quotation !== afterEntity.quotation ||
              beforeEntity.urlInfo.url !== afterEntity.urlInfo.url ||
              beforeEntity.sourceInfo.name !== afterEntity.sourceInfo.name
            ) {
              changes.push({
                type: "ModifyMediaExcerpt",
                id: afterEntity.id,
                before: {
                  quotation: beforeEntity.quotation,
                  url: beforeEntity.urlInfo.url,
                  sourceName: beforeEntity.sourceInfo.name,
                },
                after: {
                  quotation: afterEntity.quotation,
                  url: afterEntity.urlInfo.url,
                  sourceName: afterEntity.sourceInfo.name,
                },
              });
            }
          }
          break;
        }
        case "Justification": {
          if (isJustification(afterEntity)) {
            if (
              beforeEntity.basisId !== afterEntity.basisId ||
              beforeEntity.targetId !== afterEntity.targetId ||
              beforeEntity.polarity !== afterEntity.polarity
            ) {
              changes.push({
                type: "ModifyJustification",
                id: afterEntity.id,
                before: {
                  basisId: beforeEntity.basisId,
                  targetId: beforeEntity.targetId,
                  polarity: beforeEntity.polarity,
                },
                after: {
                  basisId: afterEntity.basisId,
                  targetId: afterEntity.targetId,
                  polarity: afterEntity.polarity,
                },
              });
            }
          }
          break;
        }
        case "Appearance": {
          if (isAppearance(afterEntity)) {
            if (
              beforeEntity.mediaExcerptId !== afterEntity.mediaExcerptId ||
              beforeEntity.apparitionId !== afterEntity.apparitionId
            ) {
              changes.push({
                type: "ModifyAppearance",
                id: afterEntity.id,
                before: {
                  mediaExcerptId: beforeEntity.mediaExcerptId,
                  apparitionId: beforeEntity.apparitionId,
                },
                after: {
                  mediaExcerptId: afterEntity.mediaExcerptId,
                  apparitionId: afterEntity.apparitionId,
                },
              });
            }
          }
          break;
        }
      }
    }
  }
}

function isPropositionCompound(entity: Entity): entity is PropositionCompound {
  return entity.type === "PropositionCompound";
}

function isProposition(entity: Entity): entity is Proposition {
  return entity.type === "Proposition";
}

function isMediaExcerpt(entity: Entity): entity is MediaExcerpt {
  return entity.type === "MediaExcerpt";
}

function isJustification(entity: Entity): entity is Justification {
  return entity.type === "Justification";
}

function isAppearance(entity: Entity): entity is Appearance {
  return entity.type === "Appearance";
}
