import React, { CSSProperties, useCallback } from "react";

import { Position } from "cytoscape";
import { MediaExcerpt } from "@sophistree/common";
import { GraphView } from "@sophistree/ui-common";
import { useCollaborativePresence } from "../sync/presence";
import { getDocHandle } from "../sync/sync";

import { focusMediaExcerpt } from "./focusMediaExcerpt";
import { useAppDispatch } from "../store";
import {
  addNewProposition,
  completeDrag,
  deleteEntity,
  DragPayload,
  selectEntities,
  toggleCollapsed,
  useActiveMapAutomergeDocumentId,
  useSelectedEntityIds,
} from "../store/entitiesSlice";
import { showEntityEditor } from "../store/uiSlice";
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

  const { presenceState, broadcastCursorPosition, broadcastSelection } =
    useCollaborativePresence(
      activeMapId ? getDocHandle(activeMapId) : undefined,
    );

  const onCursorMove = useCallback(
    (position: Position) => {
      if (activeMapId) {
        broadcastCursorPosition(position);
      }
    },
    [activeMapId, broadcastCursorPosition],
  );

  const onSelectEntities = useCallback(
    (ids: string[]) => {
      void dispatch(selectEntities(ids));
      if (activeMapId) {
        broadcastSelection(ids);
      }
    },
    [dispatch, activeMapId, broadcastSelection],
  );

  const onFocusMediaExcerpt = useCallback(
    (me: MediaExcerpt) => void focusMediaExcerpt(me),
    [],
  );
  const onAddNewProposition = useCallback(
    () => dispatch(addNewProposition()),
    [dispatch],
  );
  const onDeleteEntity = useCallback(
    (id: string) => dispatch(deleteEntity(id)),
    [dispatch],
  );
  const onCompleteDrag = useCallback(
    (ids: DragPayload) => dispatch(completeDrag(ids)),
    [dispatch],
  );
  const onToggleCollapse = useCallback(
    (id: string) => dispatch(toggleCollapsed(id)),
    [dispatch],
  );

  const onEditEntity = useCallback(
    (id: string) => dispatch(showEntityEditor(id)),
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
      onAddNewProposition={onAddNewProposition}
      onDeleteEntity={onDeleteEntity}
      onCompleteDrag={onCompleteDrag}
      onToggleCollapse={onToggleCollapse}
      onEditEntity={onEditEntity}
      style={style}
      presenceState={presenceState}
      onCursorMove={onCursorMove}
    />
  );
}
