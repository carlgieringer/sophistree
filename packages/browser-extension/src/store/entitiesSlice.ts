import { v4 as uuidv4 } from "uuid";
import deepEqual from "deep-equal";
import { deleteAt, getActorId } from "@automerge/automerge/next";

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
  ArgumentMapHistoryChange,
  JustificationBasisHistoryInfo,
  JustificationTargetHistoryInfo,
  HistoryInfo,
  PropositionHistoryInfo,
  MediaExcerptHistoryInfo,
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
        history: [],
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
    syncActiveMapRemotely: create.reducer<string[]>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot sync active map because there is no active map.",
        );
        return;
      }
      const addresses = action.payload;
      if (!addresses?.length) {
        appLogger.error(
          "Cannot sync active map because no sync server addresses provided.",
        );
        return;
      }
      state.activeMapAutomergeDocumentId = setDocSyncServerAddresses(
        documentId,
        addresses,
      );
    }),
    syncActiveMapLocally: create.reducer((state) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot sync active map because there is no active map.",
        );
        return;
      }
      state.activeMapAutomergeDocumentId = setDocSyncServerAddresses(
        documentId,
        [],
      );
    }),
    openSyncedMap: create.asyncThunk(
      async (
        {
          documentId,
          syncServerAddresses,
        }: { documentId: DocumentId; syncServerAddresses: string[] },
        thunkAPI,
      ) => {
        const handle = openDoc(documentId, syncServerAddresses);
        const map = await handle.doc();
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
    renameActiveMap: create.reducer<string>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot rename active map because there is no active map.",
        );
        return;
      }
      const handle = getDocHandle(documentId);
      handle.change((doc) => {
        const oldName = doc.name;
        doc.name = action.payload;
        addHistoryEntry(doc, "RenameMap", (lastChange) => ({
          type: "RenameMap",
          oldName: lastChange?.oldName ?? oldName,
          newName: action.payload,
        }));
      });
    }),
    addNewProposition: create.reducer((state) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot add new proposition to active map because there is no active map.",
        );
        return;
      }

      const handle = getDocHandle(documentId);
      const doc = handle.docSync();
      if (!doc) {
        appLogger.error(`Doc ID ${documentId} did not have a doc.`);
        return;
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
        addHistoryEntry(doc, {
          type: "AddProposition",
          id: proposition.id,
          text: proposition.text,
        });
      });
    }),
    addMediaExcerpt: create.reducer<AddMediaExcerptData>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot add new proposition to active map because there is no active map.",
        );
        return;
      }

      const {
        quotation,
        url,
        canonicalUrl,
        pdfFingerprint,
        sourceName,
        domAnchor,
        id,
      } = action.payload;

      const handle = getDocHandle(documentId);
      const activeMap = handle.docSync();
      if (!activeMap) {
        appLogger.error(`Doc ID ${documentId} did not have a doc.`);
        return;
      }

      const extantMediaExcerpt = activeMap.entities.find((e) =>
        isEquivalentMediaExcerpt(e, {
          url,
          canonicalUrl,
          pdfFingerprint,
          domAnchor,
        }),
      );
      if (extantMediaExcerpt) {
        appLogger.warn("Declining to create a duplicative MediaExcerpt.");
        return;
      }

      const sourceNameOverride = getSourceNameOverride(
        activeMap.sourceNameOverrides,
        {
          url,
          canonicalUrl,
          pdfFingerprint,
        },
      );

      // Automerge's IndexedDB storage does not support undefined values.
      const urlInfo: UrlInfo = { url };
      if (canonicalUrl !== undefined) urlInfo.canonicalUrl = canonicalUrl;
      if (pdfFingerprint !== undefined) urlInfo.pdfFingerprint = pdfFingerprint;

      const mediaExcerpt: MediaExcerpt = {
        type: "MediaExcerpt",
        ...defaultVisibilityProps,
        id,
        quotation,
        urlInfo,
        sourceInfo: { name: sourceNameOverride ?? sourceName },
        domAnchor,
      };
      handle.change((map) => {
        map.entities.push(mediaExcerpt);
        addHistoryEntry(map, {
          type: "AddMediaExcerpt",
          id: mediaExcerpt.id,
          quotation: mediaExcerpt.quotation,
          urlInfo: mediaExcerpt.urlInfo,
          sourceInfo: mediaExcerpt.sourceInfo,
          domAnchor: mediaExcerpt.domAnchor,
        });
      });
    }),
    updateProposition: create.reducer<{
      id: string;
      updates: Partial<Omit<Proposition, "type">>;
    }>((state, action) => {
      const updates = action.payload.updates;
      updateEntity<Proposition>(
        state,
        action.payload.id,
        updates,
        (map, proposition) => {
          const text = updates.text;
          if (text !== undefined) {
            addHistoryEntry(map, "ModifyProposition", (lastChange) => {
              const lastText = lastChange?.before.text ?? proposition.text;
              return {
                type: "ModifyProposition",
                id: proposition.id,
                before: {
                  text: lastText,
                },
                after: {
                  text,
                },
              };
            });
          }
        },
      );
    }),
    updateMediaExerpt: create.reducer<{
      id: string;
      updates: Partial<Omit<MediaExcerpt, "type">>;
    }>((state, action) => {
      const updates = action.payload.updates;
      updateEntity<MediaExcerpt>(
        state,
        action.payload.id,
        updates,
        (map, mediaExcerpt) => {
          const sourceName = updates.sourceInfo?.name;

          if (sourceName) {
            const { url, canonicalUrl, pdfFingerprint } = mediaExcerpt.urlInfo;
            updateSourceNameOverrides(
              map.sourceNameOverrides,
              { url, canonicalUrl, pdfFingerprint },
              sourceName,
            );

            const oldSourceName = mediaExcerpt.sourceInfo.name;

            if (sourceName !== oldSourceName) {
              addHistoryEntry(map, "ModifyMediaExcerpt", (lastChange) => ({
                type: "ModifyMediaExcerpt",
                id: mediaExcerpt.id,
                before: {
                  sourceName: lastChange?.before.sourceName ?? oldSourceName,
                },
                after: {
                  sourceName,
                },
              }));
            }
          }
        },
      );
    }),
    updateJustification: create.reducer<{
      id: string;
      updates: Partial<Omit<Justification, "type">>;
    }>((state, action) => {
      const updates = action.payload.updates;
      updateEntity<Justification>(
        state,
        action.payload.id,
        updates,
        (map, justification) => {
          const polarity = updates.polarity;
          const oldPolarity = justification.polarity;

          if (polarity && polarity !== oldPolarity) {
            const basisId = justification.basisId;
            const targetId = justification.targetId;
            addHistoryEntry(map, {
              type: "ModifyJustification",
              id: justification.id,
              oldPolarity,
              polarity,
              basisId,
              basisInfo: getJustificationBasisHistoryInfo(map, basisId),
              targetId,
              targetInfo: getJustificationTargetHistoryInfo(map, targetId),
            });
          }
        },
      );
    }),
    completeDrag: create.reducer<DragPayload>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot update an entity of the active map because there is no active map.",
        );
        return;
      }

      const handle = getDocHandle(documentId);
      const activeMap = handle.docSync();
      if (!activeMap) {
        appLogger.error(`Doc ID ${documentId} did not have a doc.`);
        return;
      }

      const { sourceId, targetId, polarity: actionPolarity } = action.payload;

      handle.change((map) => {
        const source = map.entities.find((n) => n.id === sourceId);
        if (!source) {
          appLogger.error(`Drag source node with id ${sourceId} not found`);
          return;
        }
        const target = map.entities.find((n) => n.id === targetId);
        if (!target) {
          appLogger.error(`Drag target node with id ${targetId} not found`);
          return;
        }
        applyDragOperation(map, source, target, actionPolarity);
        updateConclusions(map);
      });
    }),
    selectEntities: create.reducer<string[]>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot update an entity of the active map because there is no active map.",
        );
        return;
      }

      const handle = getDocHandle(documentId);
      const activeMap = handle.docSync();
      if (!activeMap) {
        appLogger.error(`Doc ID ${documentId} did not have a doc.`);
        return;
      }

      const selectedEntityIds = action.payload;

      // Whenever we select a MediaExcerpt, also select its Appearances
      const appearances = activeMap.entities.filter(
        (e) =>
          e.type === "Appearance" &&
          selectedEntityIds.includes(e.mediaExcerptId),
      );
      state.selectedEntityIds = [
        ...selectedEntityIds,
        ...appearances.map((a) => a.id),
      ];
    }),
    resetSelection: create.reducer((state) => {
      state.selectedEntityIds = emptySelection;
    }),
    deleteEntity: create.reducer<string>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot update an entity of the active map because there is no active map.",
        );
        return;
      }

      const handle = getDocHandle(documentId);

      handle.change((map) => {
        const entityIdToDelete = action.payload;
        const entity = map.entities.find((e) => e.id === entityIdToDelete);

        if (entity) {
          switch (entity.type) {
            case "Proposition":
              addHistoryEntry(map, {
                type: "RemoveProposition",
                id: entity.id,
                text: entity.text,
              });
              break;
            case "MediaExcerpt":
              addHistoryEntry(map, {
                type: "RemoveMediaExcerpt",
                id: entity.id,
                quotation: entity.quotation,
                urlInfo: entity.urlInfo,
                sourceInfo: entity.sourceInfo,
                domAnchor: entity.domAnchor,
              });
              break;
            case "Justification":
              {
                const { basisId, polarity, targetId } = entity;
                addHistoryEntry(map, {
                  type: "RemoveJustification",
                  id: entity.id,
                  basisId,
                  basisInfo: getJustificationBasisHistoryInfo(map, basisId),
                  polarity,
                  targetId,
                  targetInfo: getJustificationTargetHistoryInfo(
                    map,
                    entity.targetId,
                  ),
                });
              }
              break;
            case "PropositionCompound":
              // No history entry since PropositionCompounds are synthetic
              break;
            case "Appearance":
              {
                const apparitionId = entity.apparitionId;
                const mediaExcerptId = entity.mediaExcerptId;
                const apparitionInfo = map.entities.find(
                  (entity) => entity.id === apparitionId,
                ) as Proposition;
                const mediaExcerpt = map.entities.find(
                  (entity) => entity.id === apparitionId,
                ) as MediaExcerpt;
                addHistoryEntry(map, {
                  type: "RemoveAppearance",
                  id: entity.id,
                  apparitionId,
                  apparitionInfo,
                  mediaExcerptId,
                  mediaExcerpt,
                });
              }
              break;
          }
        }

        applyDeleteOperation(state, map, entityIdToDelete);
        updateConclusions(map);

        if (entity?.type === "MediaExcerpt") {
          // TODO: #3 - remove this side effect. Maybe detect the removal via useState in a component?
          void notifyTabsOfDeletedMediaExcerpt(entityIdToDelete);
        } else if (entity?.type === "Appearance") {
          updateMediaExcerptAutoVisibility(map, entity.mediaExcerptId);
        }
      });
    }),
    showEntity: create.reducer<string>((state, action) => {
      updateEntityVisibility(state, action.payload, "Visible");
    }),
    hideEntity: create.reducer<string>((state, action) => {
      updateEntityVisibility(state, action.payload, "Hidden");
    }),
    automateEntityVisibility: create.reducer<string>((state, action) => {
      removeEntityExplicitVisibility(state, action.payload);
    }),
    toggleCollapsed: create.reducer<string>((state, action) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot update an entity of the active map because there is no active map.",
        );
        return;
      }

      getDocHandle(documentId).change((map) => {
        const entity = map.entities.find((e) => e.id === action.payload);
        if (!entity) {
          appLogger.error(
            `Cannot toggle entity collapsed because there is no entity with id ${action.payload}`,
          );
          return;
        }
        entity.isCollapsed = !entity.isCollapsed;
      });
    }),
    resetActiveMapsHistory: create.reducer((state) => {
      const documentId = state.activeMapAutomergeDocumentId;
      if (!documentId) {
        appLogger.error(
          "Cannot reset the history of active map because there is no active map.",
        );
        return;
      }

      const handle = getDocHandle(documentId);

      handle.change((map) => {
        map.history = [
          {
            actorId: getActorId(map),
            timestamp: new Date().toISOString(),
            changes: [
              {
                type: "ResetHistory",
              },
            ],
          },
        ];
      });
    }),
  }),
});

function updateEntity<E extends Entity>(
  state: State,
  entityId: string,
  updates: Partial<Omit<E, "type">>,
  callback: (map: ArgumentMap, entity: E) => void,
) {
  const documentId = state.activeMapAutomergeDocumentId;
  if (!documentId) {
    appLogger.error(
      "Cannot update an entity of the active map because there is no active map.",
    );
    return;
  }

  const handle = getDocHandle(documentId);
  const activeMap = handle.docSync();
  if (!activeMap) {
    appLogger.error(`Doc ID ${documentId} did not have a doc.`);
    return;
  }

  const index = activeMap.entities.findIndex(
    (entity) => entity.id === entityId,
  );
  if (index < 0) {
    appLogger.error(
      `Cannot update entity ${entityId} because it is not present in the active map ${documentId}`,
    );
    return;
  }
  handle.change((map) => {
    const entity = activeMap.entities[index];
    callback(map, entity as E);
    Object.assign(entity, updates);
    updateConclusions(map);
  });
}

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
            addHistoryEntry(activeMap, {
              type: "ModifyPropositionCompoundAtoms",
              id: target.id,
              atoms: target.atomIds.map((id) => {
                const { type, text } = activeMap.entities.find(
                  (entity) => entity.id === id,
                ) as Proposition;
                return {
                  id,
                  type,
                  text,
                  modificationType: id === source.id ? "Added" : "Unchanged",
                };
              }),
            });
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
            const id = uuidv4();
            activeMap.entities.push({
              type: "Appearance" as const,
              id,
              apparitionId,
              mediaExcerptId,
              ...defaultVisibilityProps,
            });
            addHistoryEntry(activeMap, {
              type: "AddAppearance",
              id,
              apparitionId,
              apparitionInfo: toHistoryInfo(
                activeMap,
                apparitionId,
              ) as PropositionHistoryInfo,
              mediaExcerptId,
              mediaExcerpt: toHistoryInfo(
                activeMap,
                mediaExcerptId,
              ) as MediaExcerptHistoryInfo,
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
  const targetId = target.id;
  const newJustification: Justification = {
    id: newJustificationId,
    type: "Justification",
    targetId,
    basisId,
    polarity,
    ...defaultVisibilityProps,
  };
  activeMap.entities.push(newJustification);

  addHistoryEntry(activeMap, {
    type: "AddJustification",
    id: newJustificationId,
    basisId,
    basisInfo: getJustificationBasisHistoryInfo(activeMap, basisId),
    polarity,
    targetId,
    targetInfo: getJustificationTargetHistoryInfo(activeMap, targetId),
  });
}

function getJustificationBasisHistoryInfo(
  map: ArgumentMap,
  basisId: string,
): JustificationBasisHistoryInfo {
  return toHistoryInfo(map, basisId) as JustificationBasisHistoryInfo;
}

function getJustificationTargetHistoryInfo(
  map: ArgumentMap,
  targetId: string,
): JustificationTargetHistoryInfo {
  return toHistoryInfo(map, targetId) as JustificationTargetHistoryInfo;
}

function toHistoryInfo(map: ArgumentMap, entityId: string): HistoryInfo {
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

function updateEntityVisibility(
  state: State,
  entityId: string,
  visibility: Visibility,
) {
  const documentId = state.activeMapAutomergeDocumentId;
  if (!documentId) {
    appLogger.error(
      "Cannot update an entity of the active map because there is no active map.",
    );
    return;
  }

  const handle = getDocHandle(documentId);

  handle.change((map) => {
    const entity = map.entities.find((entity) => entity.id === entityId);
    if (!entity) {
      appLogger.error(
        `Unable to update entity visibility because the entity with ID ${entityId} was not found.`,
      );
      return;
    }
    entity.explicitVisibility = visibility;
  });
}

function removeEntityExplicitVisibility(state: State, entityId: string) {
  const documentId = state.activeMapAutomergeDocumentId;
  if (!documentId) {
    appLogger.error(
      "Cannot update an entity of the active map because there is no active map.",
    );
    return;
  }

  const handle = getDocHandle(documentId);

  handle.change((map) => {
    const entity = map.entities.find((entity) => entity.id === entityId);
    if (!entity) {
      appLogger.error(
        `Unable to update entity visibility because the entity with ID ${entityId} was not found.`,
      );
      return;
    }
    delete entity.explicitVisibility;
  });
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

/** Add a history entry to the map for the change. */
function addHistoryEntry(
  map: ArgumentMap,
  change: ArgumentMapHistoryChange,
): void;
/**
 * Add a history entry to the map for a change based on a callback. If the map's last history
 * entry had a single change that is compatible with the current change, the last change is
 * provided to the callback to combine the changes. In that case, the return value will replace
 * the last change.
 *
 * Changes are compatible if:
 *
 *  - Same change type
 *  - Same actor ID
 *  - Same action object
 *
 * changeFn should not have side effects because addHistoryEntry may call it twice: once with a
 * previous change, to see if they are compatible, and once without.
 */
function addHistoryEntry<
  CT extends ArgumentMapHistoryChange["type"],
  C extends Extract<ArgumentMapHistoryChange, { type: CT }>,
>(
  map: ArgumentMap,
  changeType: CT,
  changeFn: (lastChange: C | undefined) => C,
): void;
/**
 * Add a new history entry with a single change. We clone the change in case it references existing
 * Automerge objects. */
function addHistoryEntry<C extends ArgumentMapHistoryChange>(
  map: ArgumentMap,
  changeOrType: ArgumentMapHistoryChange | C["type"],
  changeFn?: (lastChange: C | undefined) => C,
): void {
  const actorId = getActorId(map);
  const timestamp = new Date().toISOString();

  // Direct change case
  if (typeof changeOrType !== "string") {
    map.history.push({
      actorId,
      timestamp,
      changes: [cloneChange(changeOrType)],
    });
    return;
  }

  // String type case - must have changeFn
  if (!changeFn) {
    throw new Error("changeFn is required when using a string type");
  }

  // Check if we can update the last entry
  if (map.history.length > 0) {
    const lastEntry = map.history[map.history.length - 1];
    if (lastEntry.changes.length === 1) {
      const lastChange = lastEntry.changes[0];
      if (lastChange.type === changeOrType && lastEntry.actorId === actorId) {
        // Type assertion is safe here because we've verified the types match
        const newChange = changeFn(lastChange as C);
        if (canCombineHistoryChanges(lastChange, newChange)) {
          map.history.splice(map.history.length - 1, 1, {
            actorId: getActorId(map),
            timestamp,
            changes: [cloneChange(newChange)],
          });
          return;
        }
      }
    }
  }

  // Create new entry
  const change = changeFn(undefined);
  map.history.push({
    actorId,
    timestamp,
    changes: [cloneChange(change)],
  });
}

function canCombineHistoryChanges(
  change1: ArgumentMapHistoryChange,
  change2: ArgumentMapHistoryChange,
) {
  switch (change1.type) {
    case "RenameMap":
      return change2.type === "RenameMap";
    case "ModifyProposition":
      return change2.type === "ModifyProposition" && change1.id === change2.id;
    case "ModifyMediaExcerpt":
      return change2.type === "ModifyMediaExcerpt" && change1.id === change2.id;
    default:
      return false;
  }
}

function cloneChange(change: ArgumentMapHistoryChange) {
  return JSON.parse(JSON.stringify(change)) as ArgumentMapHistoryChange;
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

/** Whether the two UrlInfos are equivalent and represent the exact same source. */
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
  resetActiveMapsHistory,
  resetSelection,
  selectEntities,
  setActiveMap,
  showEntity,
  toggleCollapsed,
  syncActiveMapLocally,
  syncActiveMapRemotely,
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
