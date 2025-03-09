import {
  ArgumentMap,
  JustificationBasisHistoryInfo,
  JustificationTargetHistoryInfo,
  HistoryInfo,
  PropositionHistoryInfo,
  MediaExcerptHistoryInfo,
} from "@sophistree/common";

export function getJustificationBasisHistoryInfo(
  map: ArgumentMap,
  basisId: string,
): JustificationBasisHistoryInfo {
  return toHistoryInfo(map, basisId) as JustificationBasisHistoryInfo;
}

export function getJustificationTargetHistoryInfo(
  map: ArgumentMap,
  targetId: string,
): JustificationTargetHistoryInfo {
  return toHistoryInfo(map, targetId) as JustificationTargetHistoryInfo;
}

export function toHistoryInfo(map: ArgumentMap, entityId: string): HistoryInfo {
  const entity = map.entities.find((e) => e.id === entityId);
  if (!entity) {
    throw new Error(`Entity not found for ID: ${entityId}`);
  }
  switch (entity.type) {
    case "Proposition":
      return { type: entity.type, id: entity.id, text: entity.text };
    case "MediaExcerpt": {
      const { type, id, quotation, sourceInfo, urlInfo, domAnchor } = entity;
      return { type, id, quotation, sourceInfo, urlInfo, domAnchor };
    }
    case "Justification": {
      const { type, id, basisId, targetId, polarity } = entity;
      return {
        type,
        id,
        basisId,
        basisInfo: getJustificationBasisHistoryInfo(map, basisId),
        targetId,
        targetInfo: getJustificationTargetHistoryInfo(map, targetId),
        polarity,
      };
    }
    case "PropositionCompound": {
      const { type, id, atomIds } = entity;
      return {
        id,
        type,
        atoms: atomIds.map((id) => {
          const propInfo = toHistoryInfo(map, id) as PropositionHistoryInfo;
          return { ...propInfo, modificationType: "Unchanged" };
        }),
      };
    }
    case "Appearance": {
      const { id, apparitionId, mediaExcerptId } = entity;
      return {
        id,
        apparitionId,
        apparitionInfo: toHistoryInfo(
          map,
          apparitionId,
        ) as PropositionHistoryInfo,
        mediaExcerptId,
        mediaExcerpt: toHistoryInfo(
          map,
          mediaExcerptId,
        ) as MediaExcerptHistoryInfo,
      };
    }
  }
}
