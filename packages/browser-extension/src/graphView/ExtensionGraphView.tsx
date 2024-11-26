import React, { CSSProperties } from "react";

import { GraphView } from "@sophistree/graph-view";

import { focusMediaExcerpt } from "./focusMediaExcerpt";
import { useAppDispatch } from "../store";
import {
  addNewProposition,
  completeDrag,
  deleteEntity,
  resetSelection,
  selectEntities,
} from "../store/entitiesSlice";
import * as appLogger from "../logging/appLogging";
import { useSelector } from "react-redux";
import * as selectors from "../store/selectors";

export default function ExtensionGraphView({
  style,
}: {
  style?: CSSProperties;
}) {
  const dispatch = useAppDispatch();
  const entities = useSelector(selectors.activeMapEntities);
  const selectedEntityIds = useSelector(selectors.selectedEntityIds);
  const outcomes = useSelector(selectors.activeMapEntitiesOutcomes);
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
    />
  );
}
