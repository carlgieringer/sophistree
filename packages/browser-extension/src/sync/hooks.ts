import {
  Doc,
  DocHandle,
  DocHandleChangePayload,
  DocumentId,
} from "@automerge/automerge-repo";
import { useEffect, useState, useMemo } from "react";

import {
  Appearance,
  ArgumentMap,
  BasisOutcome,
  determineOutcomes,
  Entity,
} from "@sophistree/common";

import { getDocHandle } from "./sync";
import * as appLogger from "../logging/appLogging";
import { combineAppearanceOutcomes } from "./combineAppearanceOutcomes";
import {
  useActiveMapAutomergeDocumentId,
  useSelectedEntityIds,
} from "../store/entitiesSlice";
import {
  addDocChangeListener,
  getAllDocs,
  removeDocChangeListener,
} from "./repos";

export const useAllMaps = () => {
  const [maps, setMaps] = useState<Doc<ArgumentMap>[]>([]);

  useEffect(() => {
    const docChangeListeners = new Map<
      DocumentId,
      (payload: DocHandleChangePayload<ArgumentMap>) => void
    >();

    const updateMaps = () => {
      getAllDocs()
        .then(async (newMaps) => {
          // Remove listeners from documents that are no longer present
          for (const [docId, listener] of docChangeListeners.entries()) {
            if (!newMaps.find((map) => map.automergeDocumentId === docId)) {
              try {
                const handle = await getDocHandle(docId);
                handle?.off("change", listener);
                docChangeListeners.delete(docId);
              } catch (error) {
                appLogger.error(
                  `Failed to remove listener for doc ID ${docId}`,
                  error,
                );
              }
            }
          }

          // Set up listeners for new documents
          for (const map of newMaps) {
            const documentId = map.automergeDocumentId as DocumentId;
            if (docChangeListeners.has(documentId)) {
              continue;
            }

            try {
              const handle = await getDocHandle(documentId);
              const listener = ({
                doc,
              }: DocHandleChangePayload<ArgumentMap>) => {
                setMaps((prevMaps) =>
                  prevMaps.map((prevMap) =>
                    prevMap.automergeDocumentId === doc.automergeDocumentId
                      ? doc
                      : prevMap,
                  ),
                );
              };
              handle.on("change", listener);
              docChangeListeners.set(documentId, listener);
            } catch (error) {
              appLogger.error(
                `Failed to set up listener for doc ID ${documentId}`,
                error,
              );
            }
          }

          setMaps(newMaps);
        })
        .catch((reason) => appLogger.error("Failed to updateMaps", reason));
    };

    updateMaps();
    addDocChangeListener(updateMaps);

    return () => {
      removeDocChangeListener(updateMaps);
      // Clean up all document change listeners
      // We can't use async/await in the cleanup function directly,
      // so we handle the promise separately
      docChangeListeners.forEach((listener, docId) => {
        getDocHandle(docId)
          .then((handle) => handle?.off("change", listener))
          .catch((error) =>
            appLogger.error(
              `Failed to clean up listener for doc ID ${docId}`,
              error,
            ),
          );
      });
    };
  }, []);

  return maps;
};

export const useActiveMap = () => {
  const documentId = useActiveMapAutomergeDocumentId();
  const [handle, setHandle] = useState(
    undefined as DocHandle<ArgumentMap> | undefined,
  );
  useEffect(() => {
    async function getHandle() {
      if (!documentId) {
        return;
      }
      setHandle(await getDocHandle(documentId));
    }
    getHandle().catch((reason) =>
      appLogger.error(
        `Failed to get doc handle for doc ID ${documentId}`,
        reason,
      ),
    );
  }, [documentId]);

  const [map, setMap] = useState(handle?.doc());

  useEffect(() => {
    setMap(handle?.doc());

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

export const useActiveMapEntitiesOutcomes = () => {
  const entities = useActiveMapEntities();
  return useMemo(() => determineOutcomes(entities), [entities]);
};

export const useActiveMapMediaExcerpts = () => {
  const entities = useActiveMapEntities();
  return useMemo(
    () => entities.filter((e) => e.type === "MediaExcerpt"),
    [entities],
  );
};

/**
 * First group the appearances by mediaExcerptId. Then aggregate the appearances'
 * propositions outcomes into a single outcome for the mediaExcerpt. See
 * combineAppearanceOutcomes for the rules.
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
