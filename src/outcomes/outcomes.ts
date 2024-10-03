import {
  Entity,
  Justification,
  Polarity,
  PropositionCompound,
} from "../store/entitiesSlice";

type BasisOutcome =
  | "Presumed"
  | "Unknown"
  | "Proven"
  | "Disproven"
  | "Contradictory";
type JustificationOutcome = "Valid" | "Invalid" | "Unknown";

/**
 * Returns the argumentative outcomes of the justification bases from entities.
 *
 * Does not handle circular dependencies.
 *
 * The logic for outcomes are:
 *
 * A Proposition is Presumed if it has no justifications and no appearances. It
 * is Unknown if it has appearances and no justifications. It is Proven if all
 * its Valid justifications have Positive polarity. It is Disproven if all its
 * Valid justifications have Negative polarity. It is Contradictory if its Valid
 * justifications are a mix of Positive and Negative polarity.
 *
 * A justification is Valid if none of its counterJustifications are Valid and its
 * basis is Presumed or Proven. It is Invalid if any of its counterJustifications
 * are Valid or if its basis is Unknown, Disproven, or Contradictory.
 *
 * MediaExcerpts are always Presumed.
 *
 * A PropositionCompound is Proven if all its proposition atoms are Proven or
 * Presumed. It is Disproven otherwise.
 */
export function determineBasisOutcomes(
  entities: Entity[],
): Map<string, BasisOutcome> {
  const basisOutcomes = new Map<string, BasisOutcome>();
  const justificationOutcomes = new Map<string, JustificationOutcome>();

  postOrderTraversal(entities, (entity, contributions, appearanceCount) => {
    switch (entity.type) {
      case "MediaExcerpt":
        basisOutcomes.set(entity.id, "Presumed");
        break;
      case "PropositionCompound": {
        const compoundOutcome = determinePropositionCompoundOutcome(
          basisOutcomes,
          entity,
        );
        basisOutcomes.set(entity.id, compoundOutcome);
        break;
      }
      case "Justification": {
        const justificationOutcome = determineJustificationOutcome(
          basisOutcomes,
          justificationOutcomes,
          entity,
          contributions,
        );
        justificationOutcomes.set(entity.id, justificationOutcome);
        break;
      }
      case "Proposition": {
        const propositionOutcome = determinePropositionOutcome(
          justificationOutcomes,
          contributions,
          appearanceCount,
        );
        basisOutcomes.set(entity.id, propositionOutcome);
        break;
      }
      case "Appearance": {
        // Do nothing
        break;
      }
    }
  });

  return basisOutcomes;
}

function determinePropositionCompoundOutcome(
  basisOutcomes: Map<string, BasisOutcome>,
  propositionCompound: PropositionCompound,
): BasisOutcome {
  for (const atomId of propositionCompound.atomIds) {
    const atomOutcome = basisOutcomes.get(atomId);
    if (atomOutcome === undefined) {
      throw new Error(`Outcome for atom ${atomId} not found`);
    }
    if (atomOutcome !== "Proven" && atomOutcome !== "Presumed") {
      return "Disproven";
    }
  }
  return "Proven";
}

function determineJustificationOutcome(
  basisOutcomes: Map<string, BasisOutcome>,
  justificationOutcomes: Map<string, JustificationOutcome>,
  justification: Justification,
  counterJustifications: OutcomeContributor[],
): JustificationOutcome {
  const basisOutcome = basisOutcomes.get(justification.basisId);
  if (basisOutcome === undefined) {
    throw new Error(`Outcome for basis ${justification.basisId} not found`);
  }

  const hasValidCounter = counterJustifications.some(
    (counter) => justificationOutcomes.get(counter.id) === "Valid",
  );

  if (
    hasValidCounter ||
    basisOutcome === "Unknown" ||
    basisOutcome === "Disproven" ||
    basisOutcome === "Contradictory"
  ) {
    return "Invalid";
  }

  return "Valid";
}

function determinePropositionOutcome(
  justificationOutcomes: Map<string, JustificationOutcome>,
  justifications: OutcomeContributor[],
  appearanceCount: number,
): BasisOutcome {
  const validJustifications = justifications.filter(
    (j) => justificationOutcomes.get(j.id) === "Valid",
  );

  if (validJustifications.length === 0) {
    return justifications.length || appearanceCount > 0
      ? "Unknown"
      : "Presumed";
  }

  const positiveCount = validJustifications.filter(
    (j) => j.polarity === "Positive",
  ).length;
  const negativeCount = validJustifications.length - positiveCount;

  if (positiveCount > 0 && negativeCount > 0) {
    return "Contradictory";
  } else if (positiveCount > 0) {
    return "Proven";
  } else {
    return "Disproven";
  }
}

type OutcomeContributor = {
  id: string;
  polarity: Polarity;
};

type OnVisitFunction = (
  entity: Entity,
  contributions: OutcomeContributor[],
  appearanceCount: number,
) => void;

function postOrderTraversal(
  entities: Entity[],
  onVisit: OnVisitFunction,
): void {
  const seen = new Set<string>();
  const { entitiesById, justificationsByTargetId, appearanceCounts } =
    entities.reduce(
      (acc, entity) => {
        acc.entitiesById.set(entity.id, entity);

        if (entity.type === "Appearance") {
          acc.appearanceCounts.set(
            entity.apparitionId,
            (acc.appearanceCounts.get(entity.apparitionId) ?? 0) + 1,
          );
        } else if (entity.type === "Justification") {
          const justifications =
            acc.justificationsByTargetId.get(entity.targetId) || [];
          justifications.push(entity);
          acc.justificationsByTargetId.set(entity.targetId, justifications);
        }

        return acc;
      },
      {
        entitiesById: new Map<string, Entity>(),
        justificationsByTargetId: new Map<string, Justification[]>(),
        appearanceCounts: new Map<string, number>(),
      },
    );

  function dfs(entityId: string) {
    if (seen.has(entityId)) return;
    seen.add(entityId);

    const entity = entitiesById.get(entityId);
    if (!entity) {
      throw new Error(
        `Entity with id ${entityId} not found. This should be impossible.`,
      );
    }

    let contributions = [] as OutcomeContributor[];
    let appearanceCount = 0;
    switch (entity.type) {
      case "Justification": {
        const counterJustifications =
          justificationsByTargetId.get(entityId) ?? [];
        for (const justification of counterJustifications) {
          dfs(justification.id);
        }

        dfs(entity.basisId);

        contributions = counterJustifications;
        break;
      }
      case "PropositionCompound": {
        for (const propositionId of entity.atomIds) {
          dfs(propositionId);
        }
        contributions = entity.atomIds.map((id) => ({
          id,
          polarity: "Positive",
        }));
        break;
      }
      case "Proposition": {
        const justifications = justificationsByTargetId.get(entityId) ?? [];
        for (const justification of justifications) {
          dfs(justification.id);
        }

        contributions = justifications;
        appearanceCount = appearanceCounts.get(entityId) ?? 0;
        break;
      }
      case "Appearance": {
        dfs(entity.apparitionId);
        contributions = justificationsByTargetId.get(entityId) ?? [];
        break;
      }
      case "MediaExcerpt":
        // No related entities to visit and no contributions
        break;
    }

    onVisit(entity, contributions, appearanceCount);
  }

  // Iterate through all entities to ensure we cover disconnected components
  for (const entity of entities) {
    if (!seen.has(entity.id)) {
      dfs(entity.id);
    }
  }
}
