import cytoscape, { ElementDataDefinition, Position } from "cytoscape";
import elk from "cytoscape-elk";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
  Fragment,
} from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Portal } from "react-native-paper";

import reactNodes from "../cytoscape/reactNodes";
import DebugElementDialog from "./DebugElementDialog";
import PropositionAppearanceDialog, {
  OnFocusMediaExcerpt,
} from "./PropositionAppearanceDialog";
import { Entity } from "@sophistree/common";
import { CollaborativePresenceState } from "../presence/types";
import RemoteCursor from "../presence/RemoteCursor";
import RemoteSelection from "../presence/RemoteSelection";
import OffScreenUsersList from "../presence/OffScreenUsersList";
import { GraphViewLogger, PropositionNodeData } from "./graphTypes";
import { OnDeleteEntity, useContextMenus } from "./useContextMenus";
import { useElements } from "./useElements";
import { Outcomes, useOutcomes } from "./useOutcomes";
import { useSelectedNodes } from "./useSelectedNodes";
import { usePanToFocusedNodes } from "./usePanToFocusedNodes";
import { useReactNodes } from "./useReactNodes";
import { getLayout } from "./layout";
import { useZoomEventHandlers } from "./useZoomEventHandlers";
import { OnSelectEntities, useSelectionHandlers } from "./useSelectionHandlers";
import {
  OnAddNewProposition,
  useDblTapToCreateNode,
} from "./useDblTapToCreateNode";
import { OnCompleteDrag, useDragHandlers } from "./useDragHandlers";
import { stylesheet } from "./graphStyles";
import { OnToggleCollapse } from "./collapsing";

import "./GraphView.scss";
import { useCursorMovement } from "./useCursorMovement";
import { useNavigateToUser } from "./useNavigateToUser";
import { useViewport } from "./useViewport";

cytoscape.use(elk);
cytoscape.use(reactNodes);

interface GraphViewProps {
  id?: string;
  // A unique identifier of the active map. Changing it resets the reactNodes extension.
  activeGraphId: string;
  style?: CSSProperties;
  entities: Entity[];
  selectedEntityIds: string[];
  outcomes: Outcomes;
  logger: GraphViewLogger;
  onSelectEntities: OnSelectEntities;
  onAddNewProposition?: OnAddNewProposition;
  onDeleteEntity?: OnDeleteEntity;
  onCompleteDrag?: OnCompleteDrag;
  onFocusMediaExcerpt: OnFocusMediaExcerpt;
  onToggleCollapse: OnToggleCollapse;
  onEditEntity?: (entityId: string) => void;
  presenceState?: CollaborativePresenceState;
  onCursorMove?: (position: Position) => void;
}

export default function GraphView({
  id,
  activeGraphId,
  style,
  entities,
  selectedEntityIds,
  outcomes,
  logger,
  onSelectEntities,
  onAddNewProposition,
  onDeleteEntity,
  onCompleteDrag,
  onFocusMediaExcerpt,
  onToggleCollapse,
  onEditEntity,
  presenceState,
  onCursorMove,
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

  const layoutGraph = useCallback((fit = false) => {
    cyRef.current?.layout(getLayout(fit)).run();
  }, []);

  const toggleCollapse = useCallback(
    (id: string) => {
      onToggleCollapse(id);
      // Nodes that appear after uncollapsing don't layout properly. So
      // Watch for them to appear and then trigger a relayout after their
      // first layout ends.
      cyRef.current?.one("add", "node", () => {
        cyRef.current?.one("layoutstop", () => {
          layoutGraph();
        });
      });
    },
    [onToggleCollapse, layoutGraph],
  );

  useReactNodes(
    cyRef,
    activeGraphId,
    setVisitAppearancesDialogProposition,
    onFocusMediaExcerpt,
    toggleCollapse,
    logger,
  );

  const { zoomIn, zoomOut } = useZoomEventHandlers(cyRef, logger);

  const contextMenu = useContextMenus({
    cyRef,
    onDeleteEntity,
    onAddNewProposition,
    onToggleCollapse: toggleCollapse,
    zoomIn,
    zoomOut,
    setDebugElementData,
    layoutGraph,
    onEditEntity,
  });
  useSelectionHandlers(cyRef, onSelectEntities);
  useDblTapToCreateNode(cyRef, onAddNewProposition);
  useDragHandlers(cyRef, onCompleteDrag);

  // Copresence
  useCursorMovement(cyRef, onCursorMove);
  const handleNavigateToUser = useNavigateToUser(cyRef, presenceState);
  const viewport = useViewport(cyRef);

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
        {presenceState &&
          Object.entries(presenceState.presenceByDeviceId).map(
            ([deviceId, presence]) => (
              <Fragment key={deviceId}>
                {presence.cursorPosition && (
                  <RemoteCursor presence={presence} cyRef={cyRef} />
                )}
                <RemoteSelection
                  selection={presence.selection}
                  displayName={presence.userDisplayName || "Unknown User"}
                  cyRef={cyRef}
                />
              </Fragment>
            ),
          )}
        {presenceState && (
          <OffScreenUsersList
            presenceState={presenceState}
            viewport={viewport}
            onNavigateToUser={handleNavigateToUser}
          />
        )}
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
