import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "./store";
import { Appearance, Entity } from "./entitiesSlice";
import { BasisOutcome, determineOutcomes } from "../outcomes/outcomes";
import * as appLogger from "../logging/appLogging";

const emptyEntities: Entity[] = [];

export const activeMapId = (state: RootState) => {
  return state.entities.activeMapId;
};

export const allMaps = (state: RootState) => {
  return state.entities.maps;
};

export const activeMap = (state: RootState) => {
  return allMaps(state).find((map) => map.id === activeMapId(state));
};

export const activeMapName = (state: RootState) => {
  return activeMap(state)?.name;
};

export const activeMapEntities = (state: RootState) => {
  return activeMap(state)?.entities || emptyEntities;
};

export const selectedEntityIds = (state: RootState) => {
  return state.entities.selectedEntityIds;
};

export const selectedEntities = createSelector(
  [activeMapEntities, selectedEntityIds],
  (entities, selectedIds) => entities.filter((e) => selectedIds.includes(e.id)),
);

const selectAllMaps = (state: RootState) => state.entities.maps;

export const allPropositions = createSelector([selectAllMaps], (allMaps) =>
  allMaps.flatMap((m) =>
    m.entities.filter((entity) => entity.type === "Proposition"),
  ),
);

export const activeMapEntitiesOutcomes = createSelector(
  [activeMapEntities],
  (entities) => {
    return determineOutcomes(entities);
  },
);

/**
 * First group the appearances by mediaExcerptId. Then aggregate the appearances'
 * propositions outcomes into a single outcome for the mediaExcerpt. The rules are:
 *
 * - "Proven" + "Presumed" = "Proven"
 * - "Disproven" + either "Proven" or "Presumed"  = "Contradictory"
 * - "Contradictory" + any other outcome = "Contradictory"
 * - "Unproven" does not change the value.
 *
 * @param state
 * @returns
 */
export const activeMapMediaExcerptOutcomes = createSelector(
  [activeMapEntities, activeMapEntitiesOutcomes],
  (entities, { basisOutcomes }) => {
    const mediaExcerptAppearances = entities.reduce((acc, entity) => {
      if (entity.type !== "Appearance") {
        return acc;
      }
      const mediaExcerptId = entity.mediaExcerptId;
      if (!acc.get(mediaExcerptId)) {
        acc.set(mediaExcerptId, []);
      }
      acc.get(mediaExcerptId)?.push(entity);

      return acc;
    }, new Map<string, Appearance[]>());

    const mediaExcerptOutcomes = new Map<string, BasisOutcome>();
    mediaExcerptAppearances.forEach((appearances, mediaExcerptId) => {
      const appearanceOutcomes = appearances.flatMap((appearance) => {
        const propositionOutcome = basisOutcomes.get(appearance.apparitionId);
        if (propositionOutcome === undefined) {
          appLogger.error(
            `Could not find proposition outcome for appearance ${appearance.id}. This should be imossible.`,
          );
          return [];
        }
        return propositionOutcome;
      });

      const outcome = appearanceOutcomes.reduce(
        combineAppearanceOutcomes,
        "Unproven",
      );

      mediaExcerptOutcomes.set(mediaExcerptId, outcome);
    });

    return mediaExcerptOutcomes;
  },
);

export function combineAppearanceOutcomes(
  outcome1: BasisOutcome,
  outcome2: BasisOutcome,
) {
  if (outcome1 === "Contradictory" || outcome2 === "Contradictory") {
    return "Contradictory";
  }
  if (outcome1 === "Unproven" && outcome2 !== "Unproven") {
    return outcome2;
  }
  if (outcome1 !== "Unproven" && outcome2 === "Unproven") {
    return outcome1;
  }
  if (outcome1 === "Disproven" && outcome2 === "Disproven") {
    return "Disproven";
  }
  if (outcome1 === "Disproven" || outcome2 === "Disproven") {
    return "Contradictory";
  }
  if (outcome1 === "Proven" || outcome2 === "Proven") {
    return "Proven";
  }
  if (outcome1 === "Presumed" || outcome2 === "Presumed") {
    return "Presumed";
  }
  return outcome1;
}
