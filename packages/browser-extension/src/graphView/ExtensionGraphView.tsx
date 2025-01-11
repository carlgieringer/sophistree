import React, { CSSProperties } from "react";

import { GraphView } from "@sophistree/ui-common";

import { focusMediaExcerpt } from "./focusMediaExcerpt";
import { useAppDispatch } from "../store";
import {
  addNewProposition,
  completeDrag,
  deleteEntity,
  resetSelection,
  selectEntities,
  toggleCollapsed,
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
  const entities = useActiveMapEntities();
  const selectedEntityIds = useSelectedEntityIds();
  const outcomes = useActiveMapEntitiesOutcomes();
  return (
    <GraphView
      style={style}
      entities={entities}
      selectedEntityIds={selectedEntityIds}
      outcomes={outcomes}
      logger={appLogger}
      onFocusMediaExcerpt={(me) => void focusMediaExcerpt(me)}
      onSelectEntities={(ids) => dispatch(selectEntities(ids))}
      onResetSelection={() => dispatch(resetSelection())}
      onAddNewProposition={() => dispatch(addNewProposition())}
      onDeleteEntity={(id) => dispatch(deleteEntity(id))}
      onCompleteDrag={(ids) => dispatch(completeDrag(ids))}
      onToggleCollapse={(id) => dispatch(toggleCollapsed(id))}
    />
  );
}
