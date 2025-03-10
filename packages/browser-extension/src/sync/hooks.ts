import {
  DeleteDocumentPayload,
  Doc,
  DocHandle,
  DocHandleChangePayload,
  DocumentId,
  DocumentPayload,
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
  getAllDocHandles,
  toDocs,
  removeDocChangeListener,
} from "./repos";

export const useAllMaps = () => {
  const [maps, setMaps] = useState<Doc<ArgumentMap>[]>([]);

  useEffect(() => {
    const docChangeListeners = new Map<
      DocumentId,
      (payload: DocHandleChangePayload<ArgumentMap>) => void
    >();

    function addListener(handle: DocHandle<ArgumentMap>) {
      const listener = ({ doc }: DocHandleChangePayload<ArgumentMap>) => {
        setMaps((prevMaps) =>
          prevMaps.map((prevMap) => (prevMap.id === doc.id ? doc : prevMap)),
        );
      };
      handle.on("change", listener);
      docChangeListeners.set(handle.documentId, listener);
    }

    async function initializeMaps() {
      const handles = await getAllDocHandles();
      // Set up listeners for new documents
      handles.forEach((handle) => {
        if (docChangeListeners.has(handle.documentId)) {
          return;
        }
        addListener(handle);
      });

      const maps = await toDocs(handles);
      setMaps(maps);
    }
    initializeMaps().catch((reason) =>
      appLogger.error("Failed to initializeMaps", reason),
    );

    const updateMaps = (payload: DocumentPayload | DeleteDocumentPayload) => {
      if ("documentId" in payload) {
        docChangeListeners.delete(payload.documentId);
        setMaps((maps) =>
          maps.filter(
            ({ automergeDocumentId }) =>
              automergeDocumentId != payload.documentId,
          ),
        );
      } else {
        addListener(payload.handle as DocHandle<ArgumentMap>);
        // Avoid: Cannot update a component (`ActiveMapDialog`) while rendering a different component (`App`).
        setTimeout(() =>
          setMaps((prevMaps) => {
            const newDoc = payload.handle.docSync();
            return newDoc ? [...prevMaps, newDoc] : prevMaps;
          }),
        );
      }
    };

    addDocChangeListener(updateMaps);

    return () => {
      removeDocChangeListener(updateMaps);
      // Clean up all document change listeners
      docChangeListeners.forEach((listener, docId) => {
        const handle = getDocHandle(docId);
        handle?.off("change", listener);
      });
    };
  }, []);

  return maps;
};

export const useActiveMap = () => {
  const documentId = useActiveMapAutomergeDocumentId();
  const [map, setMap] = useState(undefined as ArgumentMap | undefined);

  useEffect(() => {
    if (!documentId) {
      return;
    }
    const handle = getDocHandle(documentId);

    setMap(handle.docSync());

    const onDocChange = ({ doc }: DocHandleChangePayload<ArgumentMap>) =>
      setMap(doc);
    const onDocDelete = () => setMap(undefined);

    handle.on("change", onDocChange);
    handle.on("delete", onDocDelete);
    return () => {
      handle.off("change", onDocChange);
      handle.off("delete", onDocDelete);
    };
  }, [documentId]);

  return map;
};

export const useActiveMapName = () => useActiveMap()?.name;

const emptyEntities: Entity[] = [];

export const useActiveMapEntities = () => {
  const map = useActiveMap();
  return useMemo(() => map?.entities || emptyEntities, [map?.entities]);
};

export function useActiveMapHistory() {
  return useActiveMap()?.history ?? [];
}

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
