import deepEqual from "deep-equal";
import { insertAt } from "@automerge/automerge/next";

import {
  ArgumentMap,
  MediaExcerpt,
  preferredUrl,
  ConclusionInfo,
  determineOutcomes,
} from "@sophistree/common";

import * as appLogger from "../logging/appLogging";

export function updateConclusions(map: ArgumentMap) {
  const {
    propositionIds,
    justificationBasisIds,
    justificationTargetIds,
    mediaExcerptsById,
    propositionCompoundAtomIds,
    compoundIdByAtomId,
  } = map.entities.reduce(
    (acc, entity) => {
      if (entity.type === "Justification") {
        acc.justificationBasisIds.add(entity.basisId);
        if (!acc.justificationBasisIds.has(entity.targetId)) {
          acc.justificationTargetIds.add(entity.targetId);
        }
      } else if (entity.type === "Proposition") {
        acc.propositionIds.add(entity.id);
      } else if (entity.type === "MediaExcerpt") {
        acc.mediaExcerptsById.set(entity.id, entity);
      } else if (entity.type === "PropositionCompound") {
        entity.atomIds.forEach((id) => {
          acc.propositionCompoundAtomIds.add(id);
          acc.compoundIdByAtomId.set(id, entity.id);
        });
      }
      return acc;
    },
    {
      propositionIds: new Set<string>(),
      justificationBasisIds: new Set<string>(),
      justificationTargetIds: new Set<string>(),
      mediaExcerptsById: new Map<string, MediaExcerpt>(),
      propositionCompoundAtomIds: new Set<string>(),
      compoundIdByAtomId: new Map<string, string>(),
    },
  );

  const { basisOutcomes, justificationOutcomes } = determineOutcomes(
    map.entities,
  );

  const {
    sourceNamesByPropositionId,
    urlsByPropositionId,
    mediaExcerptIds,
    justificationIdsByBasisId,
    targetIdByJustificationId,
  } = map.entities.reduce(
    (acc, entity) => {
      switch (entity.type) {
        case "Appearance": {
          const mediaExcerpt = mediaExcerptsById.get(entity.mediaExcerptId);
          if (!mediaExcerpt) {
            appLogger.warn(
              `MediaExcerpt not found for Appearance: ${entity.id}`,
            );
            return acc;
          }
          if (!acc.sourceNamesByPropositionId.has(entity.apparitionId)) {
            acc.sourceNamesByPropositionId.set(entity.apparitionId, new Set());
          }
          acc.sourceNamesByPropositionId
            .get(entity.apparitionId)!
            .add(mediaExcerpt.sourceInfo.name);

          if (!acc.urlsByPropositionId.has(entity.apparitionId)) {
            acc.urlsByPropositionId.set(entity.apparitionId, new Set());
          }
          acc.urlsByPropositionId
            .get(entity.apparitionId)!
            .add(preferredUrl(mediaExcerpt.urlInfo));
          break;
        }
        case "MediaExcerpt": {
          acc.mediaExcerptIds.add(entity.id);
          break;
        }
        case "Justification": {
          // Must reconstruct the path from a MediaExcerpt to a conclusion.
          // Then for every MediaExcerpt follow the path, abandoning it
          // if the justification is countered by a valid justification.
          // Upon arriving at a conclusion, add the MediaExcerpt's SourceInfo.name
          // and preferred URL to the conclusion.
          if (!acc.justificationIdsByBasisId.has(entity.basisId)) {
            acc.justificationIdsByBasisId.set(entity.basisId, []);
          }
          acc.justificationIdsByBasisId.get(entity.basisId)?.push(entity.id);
          acc.targetIdByJustificationId.set(entity.id, entity.targetId);
          break;
        }
        default:
      }
      return acc;
    },
    {
      sourceNamesByPropositionId: new Map<string, Set<string>>(),
      urlsByPropositionId: new Map<string, Set<string>>(),
      mediaExcerptIds: new Set<string>(),
      justificationIdsByBasisId: new Map<string, string[]>(),
      targetIdByJustificationId: new Map<string, string>(),
    },
  );

  // Conclusions must be propositions that are not the basis of any justification
  // and that are the target of at least one justification.
  // Because PropositionCompounds only exist to be justification bases, we exclude
  // any proposition that is an atom.
  const conclusionPropositionIds = new Set(
    [...justificationTargetIds].filter(
      (id) =>
        propositionIds.has(id) &&
        !justificationBasisIds.has(id) &&
        !propositionCompoundAtomIds.has(id),
    ),
  );

  const mediaExcerptJustificationSourceNamesByPropositionId = new Map<
    string,
    Set<string>
  >();
  const mediaExcerptJustificationUrlsByPropositionId = new Map<
    string,
    Set<string>
  >();
  for (const mediaExcerptId of mediaExcerptIds) {
    const mediaExcerpt = mediaExcerptsById.get(mediaExcerptId);
    if (!mediaExcerpt) {
      appLogger.error(
        `MediaExcerpt not found for ID: ${mediaExcerptId}. This should be impossible because we indexed all MediaExcerpts.`,
      );
      continue;
    }
    const justificationIds = justificationIdsByBasisId.get(mediaExcerptId);
    if (!justificationIds) {
      continue;
    }
    const remainingJustificationids = [...justificationIds];
    while (remainingJustificationids.length !== 0) {
      const justificationId = remainingJustificationids.shift();
      if (!justificationId) {
        appLogger.error(
          `justificationId was falsy even though we checked for non-zero length. This should be impossible.`,
        );
        continue;
      }
      const outcome = justificationOutcomes.get(justificationId);
      if (outcome === "Invalid") {
        continue;
      }
      const targetId = targetIdByJustificationId.get(justificationId);
      if (!targetId) {
        appLogger.error(
          `Justification targetId was falsy even though all justifications must have targets. This should be impossible.`,
        );
        continue;
      }
      if (conclusionPropositionIds.has(targetId)) {
        if (
          !mediaExcerptJustificationSourceNamesByPropositionId.has(targetId)
        ) {
          mediaExcerptJustificationSourceNamesByPropositionId.set(
            targetId,
            new Set(),
          );
        }
        mediaExcerptJustificationSourceNamesByPropositionId
          .get(targetId)!
          .add(mediaExcerpt.sourceInfo.name);
        if (!mediaExcerptJustificationUrlsByPropositionId.has(targetId)) {
          mediaExcerptJustificationUrlsByPropositionId.set(targetId, new Set());
        }
        mediaExcerptJustificationUrlsByPropositionId
          .get(targetId)!
          .add(preferredUrl(mediaExcerpt.urlInfo));
      } else {
        const compoundId = compoundIdByAtomId.get(targetId);
        if (!compoundId) {
          continue;
        }
        const justificationIds = justificationIdsByBasisId.get(compoundId);
        if (!justificationIds) {
          appLogger.error(
            `PropositionCompound ID ${compoundId} had no justification. This should be impossible because the whole point of a PropositionCompound is to be the basis of a Justification.`,
          );
          continue;
        }
        remainingJustificationids.splice(
          remainingJustificationids.length,
          0,
          ...justificationIds,
        );
      }
    }
  }

  // Group conclusions by their source names and URLs
  const { conclusionGroups } = [...conclusionPropositionIds].reduce(
    (acc, id) => {
      const appearanceSourceNames = Array.from(
        sourceNamesByPropositionId.get(id) || [],
      ).sort();
      const appearanceUrls = Array.from(
        urlsByPropositionId.get(id) || [],
      ).sort();
      const key = JSON.stringify({
        sourceNames: appearanceSourceNames,
        urls: appearanceUrls,
      });

      if (!acc.conclusionGroups.has(key)) {
        acc.conclusionGroups.set(key, {
          propositionInfos: [],
          appearanceInfo: {
            sourceNames: appearanceSourceNames,
            urls: appearanceUrls,
          },
          mediaExcerptJustificationInfo: {
            sourceNames: [],
            urls: [],
          },
        });
      }
      acc.conclusionGroups
        .get(key)!
        .propositionInfos.push({ propositionId: id, outcome: "Unproven" });

      const mediaExcerptJustificationSourceNames = Array.from(
        mediaExcerptJustificationSourceNamesByPropositionId.get(id) || [],
      ).sort();
      const mediaExcerptJustificationUrls = Array.from(
        mediaExcerptJustificationUrlsByPropositionId.get(id) || [],
      ).sort();
      const mediaExcerptJustificationInfo =
        acc.conclusionGroups.get(key)!.mediaExcerptJustificationInfo;

      mediaExcerptJustificationInfo.sourceNames.splice(
        mediaExcerptJustificationInfo.sourceNames.length,
        0,
        ...mediaExcerptJustificationSourceNames,
      );
      mediaExcerptJustificationInfo.urls.splice(
        mediaExcerptJustificationInfo.urls.length,
        0,
        ...mediaExcerptJustificationUrls,
      );
      return acc;
    },
    { conclusionGroups: new Map<string, ConclusionInfo>() },
  );

  for (const [, conclusionGroup] of conclusionGroups) {
    for (const propositionInfo of conclusionGroup.propositionInfos) {
      let conclusionOutcome = basisOutcomes.get(propositionInfo.propositionId);
      if (!conclusionOutcome) {
        appLogger.error(
          `Conclusion ${propositionInfo.propositionId} lacked a basis outcome. This should be impossible.`,
        );
        conclusionOutcome = "Unproven";
      }
      propositionInfo.outcome = conclusionOutcome;
    }
  }

  let oldIndex = 0;
  let newIndex = 0;
  let mergedIndex = 0;
  const newConclusions = Array.from(conclusionGroups.entries())
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([, info]) => info);
  const oldConclusions = Array.from(map.conclusions);
  while (oldIndex < oldConclusions.length && newIndex < newConclusions.length) {
    const oldConclusion = oldConclusions[oldIndex];
    const newConclusion = newConclusions[newIndex];
    if (deepEqual(oldConclusion, newConclusion)) {
      // The conclusions are equal and there's nothing to change.
      oldIndex++;
      newIndex++;
      mergedIndex++;
    } else {
      const key1 = JSON.stringify({
        sourceNames: oldConclusion.appearanceInfo.sourceNames,
        urls: oldConclusion.appearanceInfo.urls,
      });
      const key2 = JSON.stringify({
        sourceNames: newConclusion.appearanceInfo.sourceNames,
        urls: newConclusion.appearanceInfo.urls,
      });
      const comparison = key1.localeCompare(key2);
      if (comparison > 0) {
        // The new conclusion comes before the old one
        insertAt(map.conclusions, mergedIndex, newConclusion);
        mergedIndex++;
        newIndex++;
      } else if (comparison < 0) {
        // The new conclusion comes after the old one
        oldIndex++;
      } else {
        // The new conclusion replaces the old one
        map.conclusions.splice(oldIndex, 1, newConclusion);
        oldIndex++;
        newIndex++;
        mergedIndex++;
      }
    }
  }
  const remainingNewConclusions = newConclusions.slice(newIndex);
  if (mergedIndex < map.conclusions.length) {
    map.conclusions.splice(
      mergedIndex,
      oldConclusions.length - oldIndex,
      ...remainingNewConclusions,
    );
  } else {
    // Automerge list proxies don't support using splice to insert at the end of an array.
    insertAt(
      map.conclusions,
      map.conclusions.length,
      ...remainingNewConclusions,
    );
  }
}
