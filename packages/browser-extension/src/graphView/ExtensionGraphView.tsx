import React, { CSSProperties, useEffect, useState } from "react";

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
  // TODO: #31: remove if we can get cytoscape-context-menus to work with WebKit
  const [isWebKit, setIsWebKit] = useState(true);
  useEffect(() => {
    // Check for WebKit and iOS
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isWebKitBrowser = /WebKit/.test(ua) && !/Chrome/.test(ua);
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      setIsWebKit(isWebKitBrowser || isIOS);
    }
  }, []);

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
      withContextMenus={!isWebKit}
      onFocusMediaExcerpt={(me) => void focusMediaExcerpt(me)}
      onSelectEntities={(ids) => dispatch(selectEntities(ids))}
      onResetSelection={() => dispatch(resetSelection())}
      onAddNewProposition={() => dispatch(addNewProposition())}
      onDeleteEntity={(id) => dispatch(deleteEntity(id))}
      onCompleteDrag={(ids) => dispatch(completeDrag(ids))}
    />
  );
}
