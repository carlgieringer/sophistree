import {
  Doc,
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
        .then((newMaps) => {
          // Remove listeners from documents that are no longer present
          docChangeListeners.forEach((listener, docId) => {
            if (
              !newMaps.find(
                (map) =>
                  map.automergeDocumentId === (docId as unknown as string),
              )
            ) {
              const handle = getDocHandle(docId);
              handle?.off("change", listener);
              docChangeListeners.delete(docId);
            }
          });

          // Set up listeners for new documents
          newMaps.forEach((map) => {
            const documentId = map.automergeDocumentId as unknown as DocumentId;
            if (!docChangeListeners.has(documentId)) {
              const handle = getDocHandle(documentId);
              if (handle) {
                const listener = ({
                  doc,
                }: DocHandleChangePayload<ArgumentMap>) => {
                  setMaps((currentMaps) =>
                    currentMaps.map((currentMap) =>
                      currentMap.automergeDocumentId === doc.automergeDocumentId
                        ? doc
                        : currentMap,
                    ),
                  );
                };
                handle.on("change", listener);
                docChangeListeners.set(documentId, listener);
              }
            }
          });

          setMaps(newMaps);
        })
        .catch((reason) => appLogger.error("Failed to updateMaps", reason));
    };

    updateMaps();

    addDocChangeListener(updateMaps);

    return () => {
      removeDocChangeListener(updateMaps);
      // Clean up all document change listeners
      docChangeListeners.forEach((listener, docId) => {
        const handle = getDocHandle(docId); // docId is already DocumentId from Map
        handle?.off("change", listener);
      });
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
