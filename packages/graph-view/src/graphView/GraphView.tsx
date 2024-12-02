import cytoscape, { ElementDataDefinition } from "cytoscape";
import elk from "cytoscape-elk";
import { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Portal } from "react-native-paper";

import reactNodes from "../cytoscape/reactNodes";
import DebugElementDialog from "./DebugElementDialog";
import PropositionAppearanceDialog, {
  OnFocusMediaExcerpt,
} from "./PropositionAppearanceDialog";
import { Entity } from "@sophistree/common";
import { GraphViewLogger, PropositionNodeData } from "./graphTypes";
import { OnDeleteEntity, useContextMenus } from "./useContextMenus";
import { useElements } from "./useElements";
import { Outcomes, useOutcomes } from "./useOutcomes";
import { useSelectedNodes } from "./useSelectedNodes";
import { usePanToFocusedNodes } from "./usePanToFocusedNodes";
import { useReactNodes } from "./useReactNodes";
import { getLayout } from "./layout";
import { useZoomEventHandlers } from "./useZoomEventHandlers";
import {
  OnResetSelection,
  OnSelectEntities,
  useSelectionHandlers,
} from "./useSelectionHandlers";
import {
  OnAddNewProposition,
  useDblTapToCreateNode,
} from "./useDblTapToCreateNode";
import { OnCompleteDrag, useDragHandlers } from "./useDragHandlers";
import { useLayoutOnceUponInitialLoad } from "./useLayoutOnceUponInitialLoad";
import { stylesheet } from "./graphStyles";

import "./GraphView.scss";
import { OnToggleCollapse } from "./collapsing";

cytoscape.use(elk);
cytoscape.use(reactNodes);

interface GraphViewProps {
  id?: string;
  style?: CSSProperties;
  entities: Entity[];
  selectedEntityIds: string[];
  outcomes: Outcomes;
  logger: GraphViewLogger;
  onSelectEntities: OnSelectEntities;
  onResetSelection: OnResetSelection;
  onAddNewProposition?: OnAddNewProposition;
  onDeleteEntity?: OnDeleteEntity;
  onCompleteDrag?: OnCompleteDrag;
  onFocusMediaExcerpt: OnFocusMediaExcerpt;
  onToggleCollapse: OnToggleCollapse;
}

export default function GraphView({
  id,
  style,
  entities,
  selectedEntityIds,
  outcomes,
  logger,
  onSelectEntities,
  onResetSelection,
  onAddNewProposition,
  onDeleteEntity,
  onCompleteDrag,
  onFocusMediaExcerpt,
  onToggleCollapse,
}: GraphViewProps) {
  const { elements, focusedNodeIds } = useElements(
    entities,
    selectedEntityIds,
    logger,
  );

  const cyRef = useRef<cytoscape.Core | undefined>(undefined);
  if (cyRef.current) {
    correctInvalidNodes(cyRef.current, elements);
  }

  useOutcomes(cyRef, elements, outcomes);
  useSelectedNodes(cyRef, selectedEntityIds);
  usePanToFocusedNodes(cyRef, focusedNodeIds);

  const [
    visitAppearancesDialogProposition,
    setVisitAppearancesDialogProposition,
  ] = useState(undefined as PropositionNodeData | undefined);

  const [debugElementData, setDebugElementData] = useState(
    undefined as ElementDataDefinition | undefined,
  );

  useReactNodes(
    cyRef,
    setVisitAppearancesDialogProposition,
    onFocusMediaExcerpt,
    onToggleCollapse,
    logger,
  );

  const { zoomIn, zoomOut } = useZoomEventHandlers(cyRef, logger);

  const layoutGraph = useCallback((fit = false) => {
    cyRef.current?.layout(getLayout(fit)).run();
  }, []);

  const contextMenu = useContextMenus({
    cyRef,
    onDeleteEntity,
    onAddNewProposition,
    onToggleCollapse,
    zoomIn,
    zoomOut,
    setDebugElementData,
    layoutGraph,
  });
  useSelectionHandlers(cyRef, onSelectEntities, onResetSelection);
  useDblTapToCreateNode(cyRef, onAddNewProposition);
  useDragHandlers(cyRef, onCompleteDrag);
  useLayoutOnceUponInitialLoad(cyRef, layoutGraph);

  useEffect(() => layoutGraph(), [layoutGraph, elements]);

  return (
    <>
      <CytoscapeComponent
        id={id}
        elements={elements}
        stylesheet={stylesheet}
        style={{
          ...style,
          overflow: "hidden",
        }}
        cy={(cy) => {
          cyRef.current = cy;
        }}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        userPanningEnabled={false}
        userZoomingEnabled={false}
        minZoom={0.1}
        maxZoom={10}
      />
      <Portal>
        {visitAppearancesDialogProposition && (
          <PropositionAppearanceDialog
            data={visitAppearancesDialogProposition}
            visible={!!visitAppearancesDialogProposition}
            onDismiss={() => setVisitAppearancesDialogProposition(undefined)}
            onFocusMediaExcerpt={onFocusMediaExcerpt}
            onDeleteEntity={onDeleteEntity}
          />
        )}
        {debugElementData && (
          <DebugElementDialog
            visible={true}
            data={debugElementData}
            onDismiss={() => setDebugElementData(undefined)}
          />
        )}
        {contextMenu}
      </Portal>
    </>
  );
}

/** After we delete entities we need to remove them from Cytoscape */
function correctInvalidNodes(
  cy: cytoscape.Core,
  elements: cytoscape.ElementDefinition[],
) {
  const extantIds = elements.flatMap((el) => el.data.id ?? []);

  // Remove invalid parents first. Otherwise the nodes disappear when we remove the
  // invalid parents below.
  const extantIdsSet = new Set(extantIds);
  cy.nodes().forEach((node) => {
    if (node.isChild() && !extantIdsSet.has(node.parent().first().id())) {
      node.move({ parent: null });
    }
  });

  const extantElementsSelector = extantIds.map((id) => `#${id}`).join(",");
  cy.elements().subtract(extantElementsSelector).remove();
}
