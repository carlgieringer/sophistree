import { v4 as uuidv4 } from "uuid";
import deepEqual from "deep-equal";
import { deleteAt } from "@automerge/automerge/next";

import { DomAnchor } from "tapestry-highlights";
import {
  Polarity,
  ArgumentMap,
  Proposition,
  MediaExcerpt,
  Entity,
  Justification,
  Visibility,
  PropositionCompound,
  UrlInfo,
  Appearance,
} from "@sophistree/common";

import * as appLogger from "../logging/appLogging";
import { notifyTabsOfDeletedMediaExcerpt } from "../extension/messages";
import {
  createDoc,
  deleteDoc,
  getDocHandle,
  NewArgumentMap,
  openDoc,
  setDocSyncServerAddresses,
} from "../sync";
import { DocumentId } from "@automerge/automerge-repo";
import { useSelector } from "react-redux";
import { createAppSlice } from "./createAppSlice";
import { updateConclusions } from "./conclusions";

export const defaultVisibilityProps = { autoVisibility: "Visible" as const };

export interface DragPayload {
  sourceId: string;
  targetId: string;
  polarity?: Polarity;
}

// Use the exact same type as Appearance from @sophistree/common for type safety
export type AppearanceEntity = Appearance;

const initialState = {
  activeMapAutomergeDocumentId: undefined as DocumentId | undefined,
  selectedEntityIds: [] as string[],
  isOpeningSyncedMap: false,
};

type State = typeof initialState;

const emptySelection: string[] = [];

export interface AddMediaExcerptData {
  id: string;
  quotation: string;
  url: string;
  canonicalUrl?: string;
  pdfFingerprint?: string;
  sourceName: string;
  domAnchor: DomAnchor;
}

export const entitiesSlice = createAppSlice({
  name: "entities",
  initialState,
  selectors: {
    activeMapAutomergeDocumentId: (state) => state.activeMapAutomergeDocumentId,
    selectedEntityIds: (state) => state.selectedEntityIds,
    isOpeningSyncedMap: (state) => state.isOpeningSyncedMap,
  },
  reducers: (create) => ({
    createMap: create.reducer<Partial<ArgumentMap>>((state, action) => {
      const newMap: NewArgumentMap = {
        name: "New map",
        entities: [],
        conclusions: [],
        ...action.payload,
        // Overwrite any ID from the payload to ensure that uploaded maps do not replace existing ones.
        id: uuidv4(),
        sourceNameOverrides: {},
      };
      const handle = createDoc(newMap);
      state.activeMapAutomergeDocumentId = handle.documentId;
    }),

    deleteMap: create.reducer<DocumentId>((state, action) => {
      deleteDoc(action.payload);
      if (state.activeMapAutomergeDocumentId === action.payload) {
        state.activeMapAutomergeDocumentId = undefined;
      }
    }),

    syncActiveMapRemotely: create.asyncThunk(
      async ({ addresses }: { addresses: string[] }, { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot sync active map because there is no active map.",
          );
        }
        if (!addresses?.length) {
          throw new Error(
            "Cannot sync active map because no sync server addresses provided.",
          );
        }
        return await setDocSyncServerAddresses(documentId, addresses);
      },
      {
        fulfilled: (state, action) => {
          state.activeMapAutomergeDocumentId = action.payload;
        },
      },
    ),

    syncActiveMapLocally: create.asyncThunk(
      async (_, { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot sync active map because there is no active map.",
          );
        }
        return await setDocSyncServerAddresses(documentId, []);
      },
      {
        fulfilled: (state, action) => {
          state.activeMapAutomergeDocumentId = action.payload;
        },
      },
    ),

    openSyncedMap: create.asyncThunk(
      async (
        {
          documentId,
          syncServerAddresses,
        }: { documentId: DocumentId; syncServerAddresses: string[] },
        thunkAPI,
      ) => {
        const handle = await openDoc(documentId, syncServerAddresses);
        const map = handle.doc();
        if (!map) {
          return thunkAPI.rejectWithValue(
            `Failed to open synced map ${documentId}`,
          );
        }
        return map;
      },
      {
        pending: (state) => {
          state.isOpeningSyncedMap = true;
        },
        fulfilled: (state, action) => {
          const map = action.payload;
          state.activeMapAutomergeDocumentId =
            map.automergeDocumentId as DocumentId;
        },
        settled: (state) => {
          state.isOpeningSyncedMap = false;
        },
      },
    ),

    setActiveMap: create.reducer<DocumentId | undefined>((state, action) => {
      state.activeMapAutomergeDocumentId = action.payload;
    }),

    resetSelection: create.reducer((state) => {
      state.selectedEntityIds = emptySelection;
    }),

    selectEntities: create.asyncThunk(
      async (selectedEntityIds: string[], { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot update an entity of the active map because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        const appearances = activeMap.entities.filter(
          (entity: Entity): entity is AppearanceEntity =>
            entity.type === "Appearance" &&
            "mediaExcerptId" in entity &&
            selectedEntityIds.includes(entity.mediaExcerptId),
        );
        return {
          selectedEntityIds: [
            ...selectedEntityIds,
            ...appearances.map((appearance) => appearance.id),
          ],
        };
      },
      {
        fulfilled: (state, action) => {
          state.selectedEntityIds = action.payload.selectedEntityIds;
        },
      },
    ),

    addMediaExcerpt: create.asyncThunk(
      async (data: AddMediaExcerptData, { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot add new media excerpt because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        const extantMediaExcerpt = activeMap.entities.find((e) =>
          isEquivalentMediaExcerpt(e, {
            url: data.url,
            canonicalUrl: data.canonicalUrl,
            pdfFingerprint: data.pdfFingerprint,
            domAnchor: data.domAnchor,
          }),
        );
        if (extantMediaExcerpt) {
          appLogger.warn("Declining to create a duplicative MediaExcerpt.");
          return;
        }

        const sourceNameOverride = getSourceNameOverride(
          activeMap.sourceNameOverrides,
          {
            url: data.url,
            canonicalUrl: data.canonicalUrl,
            pdfFingerprint: data.pdfFingerprint,
          },
        );

        const urlInfo: UrlInfo = { url: data.url };
        if (data.canonicalUrl !== undefined)
          urlInfo.canonicalUrl = data.canonicalUrl;
        if (data.pdfFingerprint !== undefined)
          urlInfo.pdfFingerprint = data.pdfFingerprint;

        const mediaExcerpt: MediaExcerpt = {
          type: "MediaExcerpt",
          ...defaultVisibilityProps,
          id: data.id,
          quotation: data.quotation,
          urlInfo,
          sourceInfo: { name: sourceNameOverride ?? data.sourceName },
          domAnchor: data.domAnchor,
        };

        handle.change((map) => {
          map.entities.push(mediaExcerpt);
        });
      },
    ),

    addNewProposition: create.asyncThunk(async (_, { getState }) => {
      const state = getState() as { entities: State };
      const documentId = state.entities.activeMapAutomergeDocumentId;
      if (!documentId) {
        throw new Error(
          "Cannot add new proposition because there is no active map.",
        );
      }

      const handle = await getDocHandle(documentId);
      const doc = handle.doc();
      if (!doc) {
        throw new Error(`Doc ID ${documentId} did not have a doc.`);
      }

      const nextNewPropositionNumber = getNextNewPropositionNumber(doc);
      const proposition: Proposition = {
        id: uuidv4(),
        type: "Proposition",
        text: `New Proposition ${nextNewPropositionNumber}`,
        ...defaultVisibilityProps,
      };

      handle.change((doc) => {
        doc.entities.push(proposition);
      });
    }),

    automateEntityVisibility: create.asyncThunk(
      async (entityId: string, { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot update entity visibility because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        handle.change((map) => {
          const entity = map.entities.find((e) => e.id === entityId);
          if (!entity) {
            throw new Error(
              `Unable to update entity visibility because the entity with ID ${entityId} was not found.`,
            );
          }
          delete entity.explicitVisibility;
        });
      },
    ),

    completeDrag: create.asyncThunk(
      async (
        { sourceId, targetId, polarity: actionPolarity }: DragPayload,
        { getState },
      ) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot complete drag because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        handle.change((map) => {
          const source = map.entities.find((e) => e.id === sourceId);
          if (!source) {
            throw new Error(`Drag source node with id ${sourceId} not found`);
          }
          const target = map.entities.find((e) => e.id === targetId);
          if (!target) {
            throw new Error(`Drag target node with id ${targetId} not found`);
          }
          applyDragOperation(map, source, target, actionPolarity);
          updateConclusions(map);
        });
      },
    ),

    deleteEntity: create.asyncThunk(async (entityId: string, { getState }) => {
      const state = getState() as { entities: State };
      const documentId = state.entities.activeMapAutomergeDocumentId;
      if (!documentId) {
        throw new Error("Cannot delete entity because there is no active map.");
      }

      const handle = await getDocHandle(documentId);
      handle.change((map) => {
        const entity = map.entities.find((e) => e.id === entityId);
        applyDeleteOperation(state.entities, map, entityId);
        updateConclusions(map);

        if (entity?.type === "MediaExcerpt") {
          void notifyTabsOfDeletedMediaExcerpt(entityId);
        } else if (entity?.type === "Appearance") {
          updateMediaExcerptAutoVisibility(map, entity.mediaExcerptId);
        }
      });
    }),

    hideEntity: create.asyncThunk(async (entityId: string, { getState }) => {
      const state = getState() as { entities: State };
      const documentId = state.entities.activeMapAutomergeDocumentId;
      if (!documentId) {
        throw new Error(
          "Cannot update entity visibility because there is no active map.",
        );
      }

      const handle = await getDocHandle(documentId);
      handle.change((map) => {
        const entity = map.entities.find((e) => e.id === entityId);
        if (!entity) {
          throw new Error(
            `Unable to update entity visibility because the entity with ID ${entityId} was not found.`,
          );
        }
        entity.explicitVisibility = "Hidden";
      });
    }),

    showEntity: create.asyncThunk(async (entityId: string, { getState }) => {
      const state = getState() as { entities: State };
      const documentId = state.entities.activeMapAutomergeDocumentId;
      if (!documentId) {
        throw new Error(
          "Cannot update entity visibility because there is no active map.",
        );
      }

      const handle = await getDocHandle(documentId);
      handle.change((map) => {
        const entity = map.entities.find((e) => e.id === entityId);
        if (!entity) {
          throw new Error(
            `Unable to update entity visibility because the entity with ID ${entityId} was not found.`,
          );
        }
        entity.explicitVisibility = "Visible";
      });
    }),

    toggleCollapsed: create.asyncThunk(
      async (entityId: string, { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot toggle entity collapsed state because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        handle.change((map) => {
          const entity = map.entities.find((e) => e.id === entityId);
          if (!entity) {
            throw new Error(
              `Cannot toggle entity collapsed because there is no entity with id ${entityId}`,
            );
          }
          entity.isCollapsed = !entity.isCollapsed;
        });
      },
    ),

    updateEntity: create.asyncThunk(
      async (
        { id, updates }: { id: string; updates: Partial<Omit<Entity, "type">> },
        { getState },
      ) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot update entity because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        const index = activeMap.entities.findIndex((e) => e.id === id);
        if (index < 0) {
          throw new Error(
            `Cannot update entity ${id} because it is not present in the active map ${documentId}`,
          );
        }

        handle.change((map) => {
          Object.assign(map.entities[index], updates);
          updateConclusions(map);
        });
      },
    ),

    updateJustification: create.asyncThunk(
      async (
        {
          id,
          updates,
        }: { id: string; updates: Partial<Omit<Justification, "type">> },
        { getState },
      ) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot update justification because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        const index = activeMap.entities.findIndex((e) => e.id === id);
        if (index === -1) {
          throw new Error(
            `Cannot update justification ${id} because it was not present in the active map ${documentId}`,
          );
        }

        handle.change((map) => {
          Object.assign(map.entities[index], updates);
        });
      },
    ),

    updateMediaExerpt: create.asyncThunk(
      async (
        {
          id,
          updates,
        }: { id: string; updates: Partial<Omit<MediaExcerpt, "type">> },
        { getState },
      ) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot update media excerpt because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        const index = activeMap.entities.findIndex((e) => e.id === id);
        if (index === -1) {
          throw new Error(
            `Cannot update media excerpt ${id} because it was not present in the active map ${documentId}`,
          );
        }

        handle.change((map) => {
          const mediaExcerpt = map.entities[index] as MediaExcerpt;
          const sourceName = updates.sourceInfo?.name;

          if (sourceName) {
            const { url, canonicalUrl, pdfFingerprint } = mediaExcerpt.urlInfo;
            updateSourceNameOverrides(
              map.sourceNameOverrides,
              { url, canonicalUrl, pdfFingerprint },
              sourceName,
            );
          }

          Object.assign(mediaExcerpt, updates);
          updateConclusions(map);
        });
      },
    ),

    renameActiveMap: create.asyncThunk(
      async ({ name }: { name: string }, { getState }) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot rename active map because there is no active map.",
          );
        }
        const handle = await getDocHandle(documentId);
        handle.change((doc) => (doc.name = name));
      },
    ),

    updateProposition: create.asyncThunk(
      async (
        {
          id,
          updates,
        }: { id: string; updates: Partial<Omit<Proposition, "type">> },
        { getState },
      ) => {
        const state = getState() as { entities: State };
        const documentId = state.entities.activeMapAutomergeDocumentId;
        if (!documentId) {
          throw new Error(
            "Cannot update proposition because there is no active map.",
          );
        }

        const handle = await getDocHandle(documentId);
        const activeMap = handle.doc();
        if (!activeMap) {
          throw new Error(`Doc ID ${documentId} did not have a doc.`);
        }

        const index = activeMap.entities.findIndex((e) => e.id === id);
        if (index === -1) {
          throw new Error(
            `Cannot update proposition ${id} because it was not present in the active map ${documentId}`,
          );
        }

        handle.change((map) => {
          Object.assign(map.entities[index], updates);
          updateConclusions(map);
        });
      },
    ),
  }),
});

function getSourceNameOverride(
  sourceNameOverrides: Record<string, string>,
  {
    url,
    canonicalUrl,
    pdfFingerprint,
  }: {
    url: string;
    canonicalUrl: string | undefined;
    pdfFingerprint: string | undefined;
  },
) {
  return (
    (pdfFingerprint ? sourceNameOverrides[pdfFingerprint] : undefined) ??
    sourceNameOverrides[url] ??
    (canonicalUrl ? sourceNameOverrides[canonicalUrl] : undefined)
  );
}

function updateSourceNameOverrides(
  sourceNameOverrides: Record<string, string>,
  {
    url,
    canonicalUrl,
    pdfFingerprint,
  }: {
    url: string;
    canonicalUrl: string | undefined;
    pdfFingerprint: string | undefined;
  },
  sourceName: string,
) {
  if (canonicalUrl) {
    sourceNameOverrides[canonicalUrl] = sourceName;
  }
  if (pdfFingerprint) {
    sourceNameOverrides[pdfFingerprint] = sourceName;
  }
  sourceNameOverrides[url] = sourceName;
}

function applyDeleteOperation(
  state: State,
  activeMap: ArgumentMap,
  entityIdToDelete: string,
) {
  const entitiesById = new Map(
    activeMap.entities.map((entity) => [entity.id, entity]),
  );
  const allEntityIdsToDelete = new Set([entityIdToDelete]);
  activeMap.entities.forEach((entity) => {
    // Process PropositionCompounds first since they may delete justifications
    if (entity.type === "PropositionCompound") {
      updatePropositionCompound(entity, entityIdToDelete, allEntityIdsToDelete);
    }
    // Delete justifications if either their basis or target will be deleted.
    if (
      entity.type === "Justification" &&
      (allEntityIdsToDelete.has(entity.basisId) ||
        allEntityIdsToDelete.has(entity.targetId))
    ) {
      allEntityIdsToDelete.add(entity.id);
      const basis = entitiesById.get(entity.basisId);
      // The point of PropositionCompounds is to wrap propositions in a justification.
      // So if the justification is going away, we should delete the PropositionCompound too.
      if (basis && basis.type === "PropositionCompound") {
        // If no other justifications are using the proposition compound, delete it
        const otherJustificationsUsingCompound = activeMap.entities.some(
          (e) =>
            e.type === "Justification" &&
            e.basisId === basis.id &&
            !allEntityIdsToDelete.has(e.id),
        );
        if (!otherJustificationsUsingCompound) {
          allEntityIdsToDelete.add(basis.id);
        }
      }
    }
  });
  activeMap.entities.forEach((entity) => {
    switch (entity.type) {
      case "PropositionCompound": {
        // delete proposition compounds if their last justification was deleted.
        const hasJustification = activeMap.entities.some(
          (e) => e.type === "Justification" && e.basisId === entity.id,
        );
        if (!hasJustification) {
          allEntityIdsToDelete.add(entity.id);
        }
        break;
      }
      case "Appearance": {
        // Delete appearances for deleted dependencies
        if (
          allEntityIdsToDelete.has(entity.mediaExcerptId) ||
          allEntityIdsToDelete.has(entity.apparitionId)
        ) {
          allEntityIdsToDelete.add(entity.id);
        }
        break;
      }
      default:
        break;
    }
  });

  // Remove all the collected entities
  const allIndexesToDelete = [] as number[];
  activeMap.entities.forEach((e, i) => {
    if (allEntityIdsToDelete.has(e.id)) {
      allIndexesToDelete.push(i);
    }
  });
  // Numbers are already sorted due to how we added them. Handle them in reverse
  // so that the indices remain valid after each delete.
  allIndexesToDelete.reverse().forEach((i) => {
    deleteAt(activeMap.entities, i);
  });

  state.selectedEntityIds = state.selectedEntityIds.filter(
    (id) => !allEntityIdsToDelete.has(id),
  );

  // This must come after updating the activeMap.entities.
  updateMediaExcerptAutoVisibilityForDeletedJustifications(
    activeMap,
    entitiesById,
    allEntityIdsToDelete,
  );
}

function applyDragOperation(
  activeMap: ArgumentMap,
  source: Entity,
  target: Entity,
  actionPolarity: Polarity | undefined,
) {
  let basisId: string;
  switch (source.type) {
    case "Proposition": {
      switch (target.type) {
        case "PropositionCompound": {
          if (!target.atomIds.includes(source.id)) {
            target.atomIds.push(source.id);
          } else {
            appLogger.log(
              `Proposition ID ${source.id} is already an atom of proposition compound ID ${target.id}. Skipping add it.`,
            );
          }
          return;
        }
        case "Justification":
        case "Proposition": {
          let propositionCompound = activeMap.entities.find(
            (e) =>
              e.type === "PropositionCompound" &&
              e.atomIds.length === 1 &&
              e.atomIds[0] === source.id,
          );
          if (!propositionCompound) {
            propositionCompound = {
              type: "PropositionCompound" as const,
              id: uuidv4(),
              atomIds: [source.id],
              ...defaultVisibilityProps,
            };
            activeMap.entities.push(propositionCompound);
          }
          basisId = propositionCompound.id;
          break;
        }
        case "MediaExcerpt": {
          const apparitionId = source.id;
          const mediaExcerptId = target.id;
          const extantAppearance = activeMap.entities.find(
            (e) =>
              e.type === "Appearance" &&
              e.apparitionId === apparitionId &&
              e.mediaExcerptId === mediaExcerptId,
          );
          if (!extantAppearance) {
            activeMap.entities.push({
              type: "Appearance" as const,
              id: uuidv4(),
              apparitionId,
              mediaExcerptId,
              ...defaultVisibilityProps,
            });
            updateMediaExcerptAutoVisibility(activeMap, mediaExcerptId);
          } else {
            appLogger.log(
              `Appearance between apparition ID ${apparitionId} and media excerpt ID ${mediaExcerptId} already exists. Skipping creation.`,
            );
          }
          return;
        }
        default: {
          appLogger.error(
            `Invalid target type ${target.type} for source type ${source.type}`,
          );
          return;
        }
      }
      break;
    }
    case "MediaExcerpt": {
      switch (target.type) {
        case "MediaExcerpt":
        case "PropositionCompound":
          appLogger.error(
            `Invalid target type ${target.type} for source type ${source.type}`,
          );
          return;
        default:
          break;
      }
      basisId = source.id;
      break;
    }
    default:
      appLogger.error(`Invalid drag source type type: ${source.type}`);
      return;
  }

  const extantJustification = activeMap.entities.find(
    (e) =>
      e.type === "Justification" &&
      e.targetId === target.id &&
      e.basisId === basisId,
  );
  if (extantJustification) {
    appLogger.info("Extant justification found, not creating a new one.");
    return;
  }

  const newJustificationId = uuidv4();
  const polarity =
    // Counter justifications must be negative
    target.type === "Justification"
      ? "Negative"
      : (actionPolarity ?? "Positive");
  const newJustification: Justification = {
    id: newJustificationId,
    type: "Justification",
    targetId: target.id,
    basisId,
    polarity,
    ...defaultVisibilityProps,
  };
  activeMap.entities.push(newJustification);
}

function updateMediaExcerptAutoVisibilityForDeletedJustifications(
  map: ArgumentMap,
  entitiesById: Map<string, Entity>,
  allEntityIdsToDelete: Set<string>,
) {
  const deletedJustificationMediaExcerptBasisIds: string[] = [];
  allEntityIdsToDelete.forEach((id) => {
    const entity = entitiesById.get(id);
    if (entity?.type === "Justification") {
      const basis = entitiesById.get(entity.basisId);
      if (basis?.type === "MediaExcerpt") {
        deletedJustificationMediaExcerptBasisIds.push(basis.id);
      }
    }
  });
  deletedJustificationMediaExcerptBasisIds.forEach((id) =>
    updateMediaExcerptAutoVisibility(map, id),
  );
}

function updatePropositionCompound(
  entity: PropositionCompound,
  entityIdToDelete: string,
  allEntityIdsToDelete: Set<string>,
) {
  entity.atomIds = entity.atomIds.filter((id) => id !== entityIdToDelete);
  if (entity.atomIds.length === 0) {
    allEntityIdsToDelete.add(entity.id);
  }
}

function updateMediaExcerptAutoVisibility(
  activeMap: ArgumentMap,
  mediaExcerptId: string,
) {
  // If a MediaExcerpt is only used in appearances, hide it.
  // If a MediaExcerpt is unused or used in Justifications, show it.
  let autoVisibility: Visibility = "Visible";
  for (const entity of activeMap.entities) {
    if (entity.type === "Justification" && entity.basisId === mediaExcerptId) {
      autoVisibility = "Visible";
      break;
    }
    if (
      entity.type === "Appearance" &&
      entity.mediaExcerptId === mediaExcerptId
    ) {
      autoVisibility = "Hidden";
    }
  }
  const mediaExcerpt = activeMap.entities.find(
    (entity) => entity.id === mediaExcerptId,
  );
  if (!mediaExcerpt) {
    appLogger.error(
      `Unable to update MediaExcerpt visibility because MediaExcerpt with ID ${mediaExcerptId} was missing`,
    );
    return;
  }
  mediaExcerpt.autoVisibility = autoVisibility;
}

function getNextNewPropositionNumber(map: ArgumentMap) {
  const maxNum = map.entities.reduce((maxNum, entity) => {
    if (entity.type !== "Proposition") {
      return maxNum;
    }
    const match = entity.text.match(/New Proposition (\d+)/);
    const num = match?.[1];
    if (!num) {
      return maxNum;
    }
    return Math.max(parseInt(num, 10), maxNum);
  }, 0);
  return maxNum + 1;
}

export function isEquivalentMediaExcerpt(
  e: Entity,
  {
    url,
    canonicalUrl,
    pdfFingerprint,
    domAnchor,
  }: {
    url: string;
    canonicalUrl: string | undefined;
    pdfFingerprint: string | undefined;
    domAnchor: DomAnchor;
  },
) {
  return (
    e.type === "MediaExcerpt" &&
    isEquivalentUrlInfo(e.urlInfo, { url, canonicalUrl, pdfFingerprint }) &&
    deepEqual(e.domAnchor, domAnchor)
  );
}

export function isEquivalentUrlInfo(urlInfo1: UrlInfo, urlInfo2: UrlInfo) {
  return (
    urlInfo1.url === urlInfo2.url &&
    urlInfo1.canonicalUrl === urlInfo2.canonicalUrl &&
    urlInfo1.pdfFingerprint === urlInfo2.pdfFingerprint
  );
}

export const {
  addMediaExcerpt,
  addNewProposition,
  automateEntityVisibility,
  completeDrag,
  createMap,
  deleteEntity,
  deleteMap,
  hideEntity,
  openSyncedMap,
  renameActiveMap,
  resetSelection,
  selectEntities,
  setActiveMap,
  showEntity,
  toggleCollapsed,
  syncActiveMapLocally,
  syncActiveMapRemotely,
  updateEntity,
  updateJustification,
  updateMediaExerpt,
  updateProposition,
} = entitiesSlice.actions;

export function useActiveMapAutomergeDocumentId() {
  return useSelector(entitiesSlice.selectors.activeMapAutomergeDocumentId);
}

export function useSelectedEntityIds() {
  return useSelector(entitiesSlice.selectors.selectedEntityIds);
}

export function useIsOpeningSyncedMap() {
  return useSelector(entitiesSlice.selectors.isOpeningSyncedMap);
}

export default entitiesSlice.reducer;
