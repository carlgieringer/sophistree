import {
  Doc,
  DocHandleChangePayload,
  DocumentId,
} from "@automerge/automerge-repo";

import {
  Appearance,
  ArgumentMap,
  BasisOutcome,
  determineOutcomes,
  Entity,
} from "@sophistree/common";

import {
  getDocHandle,
  getAllDocs,
  addDocChangeListener,
  removeDocChangeListener,
} from "./sync";
import * as appLogger from "../logging/appLogging";
import { combineAppearanceOutcomes } from "./combineAppearanceOutcomes";
import { useEffect, useState, useMemo } from "react";
import {
  useActiveMapAutomergeDocumentId,
  useSelectedEntityIds,
} from "../store/entitiesSlice";

export const useAllMaps = () => {
  const [maps, setMaps] = useState<Doc<ArgumentMap>[]>([]);

  useEffect(() => {
    const updateMaps = () => {
      setMaps(getAllDocs());
    };

    updateMaps();

    addDocChangeListener(updateMaps);
    return () => {
      removeDocChangeListener(updateMaps);
    };
  }, []);

  return maps;
};

export const useActiveMap = () => {
  const documentId = useActiveMapAutomergeDocumentId();
  const handle = documentId ? getDocHandle(documentId) : undefined;

  const [map, setMap] = useState(handle?.docSync());

  useEffect(() => {
    setMap(handle?.docSync());

    const onDocChange = ({ doc }: DocHandleChangePayload<ArgumentMap>) =>
      setMap(doc);
    const onDocDelete = () => setMap(undefined);

    handle?.on("change", onDocChange);
    handle?.on("delete", onDocDelete);
    return () => {
      handle?.off("change", onDocChange);
      handle?.off("delete", onDocDelete);
    };
  }, [handle]);

  return map;
};

export const useActiveMapName = () => useActiveMap()?.name;

const emptyEntities: Entity[] = [];

export const useActiveMapEntities = () => {
  const map = useActiveMap();
  return useMemo(() => map?.entities || emptyEntities, [map?.entities]);
};

export const useSelectedEntities = () => {
  const entities = useActiveMapEntities();
  const selectedEntityIds = useSelectedEntityIds();
  return useMemo(
    () => entities.filter((e: Entity) => selectedEntityIds.includes(e.id)),
    [entities, selectedEntityIds],
  );
};

export const useSelectedEntitiesForEdit = () => {
  const selectedEntities = useSelectedEntities();
  return useMemo(
    () => selectedEntities.filter((e: Entity) => e.type !== "Appearance"),
    [selectedEntities],
  );
};

export const usePropositionTexts = (propositionIds: string[]) => {
  const [propositionTextById, setPropositionTextById] = useState<
    Record<string, string>
  >({});
  const maps = useAllMaps();

  useEffect(() => {
    const initialTexts: Record<string, string> = {};

    // Get initial texts
    maps.forEach((map) => {
      map.entities.forEach((entity) => {
        if (
          entity.type === "Proposition" &&
          propositionIds.includes(entity.id)
        ) {
          initialTexts[entity.id] = entity.text;
        }
      });
    });

    setPropositionTextById(initialTexts);

    // Set up listeners for each map that might contain our propositions
    const cleanup = maps.map((map) => {
      const handle = getDocHandle(map.automergeDocumentId as DocumentId);
      if (!handle) return () => {};

      const onDocChange = ({ doc }: DocHandleChangePayload<ArgumentMap>) => {
        const updatedTexts: Record<string, string> = {};
        let hasChanges = false;

        doc.entities.forEach((entity) => {
          if (
            entity.type === "Proposition" &&
            propositionIds.includes(entity.id)
          ) {
            updatedTexts[entity.id] = entity.text;
            hasChanges = true;
          }
        });

        if (hasChanges) {
          setPropositionTextById((prev) => ({ ...prev, ...updatedTexts }));
        }
      };

      handle.on("change", onDocChange);
      return () => handle.off("change", onDocChange);
    });

    return () => cleanup.forEach((fn) => fn());
  }, [maps, propositionIds]);

  return propositionTextById;
};

export const useActiveMapEntitiesOutcomes = () => {
  const entities = useActiveMapEntities();
  return useMemo(() => determineOutcomes(entities), [entities]);
};

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
 * @returns Map of mediaExcerptId to BasisOutcome
 */
export const useActiveMapMediaExcerptOutcomes = () => {
  const entities = useActiveMapEntities();
  const { basisOutcomes } = useActiveMapEntitiesOutcomes();

  const mediaExcerptAppearances = useMemo(
    () =>
      entities.reduce((acc: Map<string, Appearance[]>, entity: Entity) => {
        if (entity.type !== "Appearance") {
          return acc;
        }
        const mediaExcerptId = entity.mediaExcerptId;
        if (!acc.get(mediaExcerptId)) {
          acc.set(mediaExcerptId, []);
        }
        acc.get(mediaExcerptId)?.push(entity);

        return acc;
      }, new Map<string, Appearance[]>()),
    [entities],
  );

  const mediaExcerptOutcomes = useMemo(() => {
    const outcomes = new Map<string, BasisOutcome>();
    mediaExcerptAppearances.forEach(
      (appearances: Appearance[], mediaExcerptId: string) => {
        const appearanceOutcomes = appearances.flatMap(
          (appearance: Appearance) => {
            const propositionOutcome = basisOutcomes.get(
              appearance.apparitionId,
            );
            if (propositionOutcome === undefined) {
              appLogger.error(
                `Could not find proposition outcome for appearance ${appearance.id}. This should be impossible.`,
              );
              return [];
            }
            return propositionOutcome;
          },
        );

        const outcome = appearanceOutcomes.reduce(
          combineAppearanceOutcomes,
          "Unproven" as BasisOutcome,
        );

        outcomes.set(mediaExcerptId, outcome);
      },
    );

    return outcomes;
  }, [mediaExcerptAppearances, basisOutcomes]);

  return mediaExcerptOutcomes;
};
