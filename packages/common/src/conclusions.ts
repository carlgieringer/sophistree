import { extractHostname } from "./urls";
import { ConclusionInfo, Entity, MediaExcerpt } from "./entities";
import { Logger } from "./logging";
import { determineOutcomes } from "./outcomes";

export function calculateConclusions(
  entities: Entity[],
  logger: Logger = console,
): ConclusionInfo[] {
  const {
    propositionIds,
    justificationBasisIds,
    justificationTargetIds,
    mediaExcerptsById,
    propositionCompoundAtomIds,
    compoundIdByAtomId,
  } = entities.reduce(
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

  const { basisOutcomes, justificationOutcomes } = determineOutcomes(entities);

  const {
    sourceNamesByPropositionId,
    hostnamesByPropositionId,
    mediaExcerptIds,
    justificationIdsByBasisId,
    targetIdByJustificationId,
  } = entities.reduce(
    (acc, entity) => {
      switch (entity.type) {
        case "Appearance": {
          const mediaExcerpt = mediaExcerptsById.get(entity.mediaExcerptId);
          if (!mediaExcerpt) {
            logger.warn(`MediaExcerpt not found for Appearance: ${entity.id}`);
            return acc;
          }
          if (!acc.sourceNamesByPropositionId.has(entity.apparitionId)) {
            acc.sourceNamesByPropositionId.set(entity.apparitionId, new Set());
          }
          acc.sourceNamesByPropositionId
            .get(entity.apparitionId)!
            .add(mediaExcerpt.sourceInfo.name);

          if (!acc.hostnamesByPropositionId.has(entity.apparitionId)) {
            acc.hostnamesByPropositionId.set(entity.apparitionId, new Set());
          }
          acc.hostnamesByPropositionId
            .get(entity.apparitionId)!
            .add(extractHostname(mediaExcerpt.urlInfo));
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
          // and hostname to the conclusion.
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
      hostnamesByPropositionId: new Map<string, Set<string>>(),
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
  const mediaExcerptJustificationHostnamesByPropositionId = new Map<
    string,
    Set<string>
  >();
  for (const mediaExcerptId of mediaExcerptIds) {
    const mediaExcerpt = mediaExcerptsById.get(mediaExcerptId);
    if (!mediaExcerpt) {
      logger.error(
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
        logger.error(
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
        logger.error(
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
        if (!mediaExcerptJustificationHostnamesByPropositionId.has(targetId)) {
          mediaExcerptJustificationHostnamesByPropositionId.set(
            targetId,
            new Set(),
          );
        }
        mediaExcerptJustificationHostnamesByPropositionId
          .get(targetId)!
          .add(extractHostname(mediaExcerpt.urlInfo));
      } else {
        const compoundId = compoundIdByAtomId.get(targetId);
        if (!compoundId) {
          continue;
        }
        const justificationIds = justificationIdsByBasisId.get(compoundId);
        if (!justificationIds) {
          logger.error(
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

  // Group conclusions by their source names and domains
  const { conclusionGroups } = [...conclusionPropositionIds].reduce(
    (acc, id) => {
      const appearanceSourceNames = Array.from(
        sourceNamesByPropositionId.get(id) || [],
      ).sort();
      const appearanceHostnames = Array.from(
        hostnamesByPropositionId.get(id) || [],
      ).sort();
      const key = JSON.stringify({
        sourceNames: appearanceSourceNames,
        hostnames: appearanceHostnames,
      });

      if (!acc.conclusionGroups.has(key)) {
        acc.conclusionGroups.set(key, {
          propositionInfos: [],
          appearanceInfo: {
            sourceNames: appearanceSourceNames,
            domains: appearanceHostnames,
          },
          mediaExcerptJustificationInfo: {
            sourceNames: [],
            domains: [],
          },
        });
      }
      acc.conclusionGroups
        .get(key)!
        .propositionInfos.push({ propositionId: id, outcome: "Unproven" });

      const mediaExcerptJustificationSourceNames = Array.from(
        mediaExcerptJustificationSourceNamesByPropositionId.get(id) || [],
      ).sort();
      const mediaExcerptJustificationHostnames = Array.from(
        mediaExcerptJustificationHostnamesByPropositionId.get(id) || [],
      ).sort();
      const mediaExcerptJustificationInfo =
        acc.conclusionGroups.get(key)!.mediaExcerptJustificationInfo;

      mediaExcerptJustificationInfo.sourceNames.splice(
        mediaExcerptJustificationInfo.sourceNames.length,
        0,
        ...mediaExcerptJustificationSourceNames,
      );
      mediaExcerptJustificationInfo.domains.splice(
        mediaExcerptJustificationInfo.domains.length,
        0,
        ...mediaExcerptJustificationHostnames,
      );
      return acc;
    },
    { conclusionGroups: new Map<string, ConclusionInfo>() },
  );

  for (const [, conclusionGroup] of conclusionGroups) {
    for (const propositionInfo of conclusionGroup.propositionInfos) {
      let conclusionOutcome = basisOutcomes.get(propositionInfo.propositionId);
      if (!conclusionOutcome) {
        logger.error(
          `Conclusion ${propositionInfo.propositionId} lacked a basis outcome. This should be impossible.`,
        );
        conclusionOutcome = "Unproven";
      }
      propositionInfo.outcome = conclusionOutcome;
    }
  }

  return Array.from(conclusionGroups.entries())
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([, info]) => info);
}
