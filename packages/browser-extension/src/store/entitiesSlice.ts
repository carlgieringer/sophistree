import { v4 as uuidv4 } from "uuid";
import deepEqual from "deep-equal";
import { deleteAt, insertAt } from "@automerge/automerge/next";

import { DomAnchor } from "tapestry-highlights";
import {
  Polarity,
  ArgumentMap,
  Proposition,
  MediaExcerpt,
  Entity,
  Justification,
  preferredUrl,
  ConclusionInfo,
  Visibility,
  PropositionCompound,
  UrlInfo,
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

export const defaultVisibilityProps = { autoVisibility: "Visible" as const };

interface DragPayload {
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
      handle.change((doc) => (doc.name = action.payload));
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
        updateConclusions(doc);
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
      handle.change((map) => map.entities.push(mediaExcerpt));
    }),
    updateEntity: create.reducer<{
      id: string;
      updates: Partial<Omit<Entity, "type">>;
    }>((state, action) => {
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
        (entity) => entity.id === action.payload.id,
      );
      if (index < 0) {
        appLogger.error(
          `Cannot update entity ${action.payload.id} because it is not present in the active map ${documentId}`,
        );
        return;
      }
      handle.change((map) => {
        Object.assign(map.entities[index], action.payload.updates);
        updateConclusions(map);
      });
    }),
    updateProposition: create.reducer<{
      id: string;
      updates: Partial<Omit<Proposition, "type">>;
    }>((state, action) => {
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
        (entity) => entity.id === action.payload.id,
      );
      if (index === -1) {
        appLogger.error(
          `Cannot update proposition ${action.payload.id} because it was not present in the active map ${documentId}`,
        );
        return;
      }

      handle.change((map) => {
        Object.assign(map.entities[index], action.payload.updates);
        updateConclusions(map);
      });
    }),
    updateMediaExerpt: create.reducer<{
      id: string;
      updates: Partial<Omit<MediaExcerpt, "type">>;
    }>((state, action) => {
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
        (e) => e.id === action.payload.id,
      );
      if (index === -1) {
        appLogger.error(
          `Cannot update MediaExcerpt ${action.payload.id} because it was not present in the active map ${documentId}`,
        );
        return;
      }

      handle.change((map) => {
        const mediaExcerpt = map.entities[index] as unknown as MediaExcerpt;

        const updates = action.payload.updates;
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
      });
    }),
    updateJustification: create.reducer<{
      id: string;
      updates: Partial<Omit<Justification, "type">>;
    }>((state, action) => {
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
        (e) => e.id === action.payload.id,
      );
      if (index === -1) {
        appLogger.error(
          `Cannot update MediaExcerpt ${action.payload.id} because it was not present in the active map ${documentId}`,
        );
        return;
      }

      handle.change((map) => {
        Object.assign(map.entities[index], action.payload.updates);
      });
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

      const source = activeMap.entities.find((n) => n.id === sourceId);
      if (!source) {
        appLogger.error(`Drag source node with id ${sourceId} not found`);
        return;
      }
      const target = activeMap.entities.find((n) => n.id === targetId);
      if (!target) {
        appLogger.error(`Drag target node with id ${targetId} not found`);
        return;
      }

      handle.change((map) => {
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
      updateEntityVisibility(state, action.payload, undefined);
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

export function updateConclusions(map: ArgumentMap) {
  const {
    propositionIds,
    justificationBasisIds,
    justificationTargetIds,
    mediaExcerptsById,
    propositionCompoundAtomIds,
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
        entity.atomIds.forEach((id) => acc.propositionCompoundAtomIds.add(id));
      }
      return acc;
    },
    {
      propositionIds: new Set<string>(),
      justificationBasisIds: new Set<string>(),
      justificationTargetIds: new Set<string>(),
      mediaExcerptsById: new Map<string, MediaExcerpt>(),
      propositionCompoundAtomIds: new Set<string>(),
    },
  );

  const { sourceNamesByPropositionId, urlsByPropositionId } =
    map.entities.reduce(
      (acc, entity) => {
        if (entity.type === "Appearance") {
          const mediaExcerpt = mediaExcerptsById.get(entity.mediaExcerptId);
          if (mediaExcerpt) {
            if (!acc.sourceNamesByPropositionId.has(entity.apparitionId)) {
              acc.sourceNamesByPropositionId.set(
                entity.apparitionId,
                new Set(),
              );
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
          } else {
            appLogger.warn(
              `MediaExcerpt not found for Appearance: ${entity.id}`,
            );
          }
        }
        return acc;
      },
      {
        sourceNamesByPropositionId: new Map<string, Set<string>>(),
        urlsByPropositionId: new Map<string, Set<string>>(),
      },
    );

  // Conclusions must be propositions that are not the basis of any justification.
  // Because PropositionCompounds only exist to be justification bases, we exclude
  // any proposition that is an atom.
  const conclusionPropositionIds = [...justificationTargetIds].filter(
    (id) =>
      propositionIds.has(id) &&
      !justificationBasisIds.has(id) &&
      !propositionCompoundAtomIds.has(id),
  );

  // Group conclusions by their source names and URLs
  const { conclusionGroups } = conclusionPropositionIds.reduce(
    (acc, id) => {
      const sourceNames = Array.from(
        sourceNamesByPropositionId.get(id) || [],
      ).sort();
      const urls = Array.from(urlsByPropositionId.get(id) || []).sort();
      const key = JSON.stringify({ sourceNames, urls });

      if (!acc.conclusionGroups.has(key)) {
        acc.conclusionGroups.set(key, {
          propositionIds: [],
          sourceNames,
          urls,
        });
      }
      acc.conclusionGroups.get(key)!.propositionIds.push(id);
      return acc;
    },
    { conclusionGroups: new Map<string, ConclusionInfo>() },
  );

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
        sourceNames: oldConclusion.sourceNames,
        urls: oldConclusion.urls,
      });
      const key2 = JSON.stringify({
        sourceNames: newConclusion.sourceNames,
        urls: newConclusion.urls,
      });
      const comparison = key1.localeCompare(key2);
      if (comparison > 0) {
        // The new conclusion comes before the old one
        insertAt(map.conclusions, mergedIndex);
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
  map.conclusions.splice(
    mergedIndex,
    oldConclusions.length - oldIndex,
    ...remainingNewConclusions,
  );
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

function updateEntityVisibility(
  state: State,
  entityId: string,
  visibility: Visibility | undefined,
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
