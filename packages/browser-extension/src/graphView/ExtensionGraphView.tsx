import React, { CSSProperties, useCallback } from "react";

import { MediaExcerpt } from "@sophistree/common";
import { GraphView } from "@sophistree/ui-common";

import { focusMediaExcerpt } from "./focusMediaExcerpt";
import { useAppDispatch } from "../store";
import {
  addNewProposition,
  completeDrag,
  deleteEntity,
  DragPayload,
  resetSelection,
  selectEntities,
  toggleCollapsed,
  useActiveMapAutomergeDocumentId,
  useSelectedEntityIds,
} from "../store/entitiesSlice";
import * as appLogger from "../logging/appLogging";
import {
  useActiveMapEntities,
  useActiveMapEntitiesOutcomes,
} from "../sync/hooks";

export default function ExtensionGraphView({
  style,
}: {
  style?: CSSProperties;
}) {
  const dispatch = useAppDispatch();
  const activeMapId = useActiveMapAutomergeDocumentId();
  const entities = useActiveMapEntities();
  const selectedEntityIds = useSelectedEntityIds();
  const outcomes = useActiveMapEntitiesOutcomes();

  const onFocusMediaExcerpt = useCallback(
    (me: MediaExcerpt) => void focusMediaExcerpt(me),
    [],
  );
  const onSelectEntities = useCallback(
    (ids: string[]) => {
      dispatch(selectEntities(ids))
        .unwrap()
        .catch((reason) =>
          appLogger.error("Faildd to select entities", reason),
        );
    },
    [dispatch],
  );
  const onResetSelection = useCallback(
    () => dispatch(resetSelection()),
    [dispatch],
  );
  const onAddNewProposition = useCallback(() => {
    dispatch(addNewProposition())
      .unwrap()
      .catch((reason) =>
        appLogger.error("Faildd to add new proposition", reason),
      );
  }, [dispatch]);
  const onDeleteEntity = useCallback(
    (id: string) => {
      dispatch(deleteEntity(id))
        .unwrap()
        .catch((reason) => appLogger.error("Faildd to delete entity", reason));
    },
    [dispatch],
  );
  const onCompleteDrag = useCallback(
    (ids: DragPayload) => {
      dispatch(completeDrag(ids))
        .unwrap()
        .catch((reason) => appLogger.error("Faildd to complete drag", reason));
    },
    [dispatch],
  );
  const onToggleCollapse = useCallback(
    (id: string) => {
      dispatch(toggleCollapsed(id))
        .unwrap()
        .catch((reason) =>
          appLogger.error("Faildd to toggle collapse", reason),
        );
    },
    [dispatch],
  );

  if (!activeMapId) {
    return "loading";
  }

  return (
    <GraphView
      activeGraphId={activeMapId}
      entities={entities}
      selectedEntityIds={selectedEntityIds}
      outcomes={outcomes}
      logger={appLogger}
      onFocusMediaExcerpt={onFocusMediaExcerpt}
      onSelectEntities={onSelectEntities}
      onResetSelection={onResetSelection}
      onAddNewProposition={onAddNewProposition}
      onDeleteEntity={onDeleteEntity}
      onCompleteDrag={onCompleteDrag}
      onToggleCollapse={onToggleCollapse}
      style={style}
    />
  );
}
