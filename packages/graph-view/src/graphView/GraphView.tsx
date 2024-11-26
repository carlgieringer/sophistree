import { MutableRefObject } from "react";
import cn from "classnames";
import cytoscape, {
  EdgeDataDefinition,
  EdgeSingular,
  ElementDataDefinition,
  ElementDefinition,
  EventHandler,
  EventObject,
  EventObjectEdge,
  EventObjectNode,
  NodeDataDefinition,
  NodeSingular,
  Position,
  SingularElementArgument,
} from "cytoscape";
import contextMenus, { MenuItem } from "cytoscape-context-menus";
import elk from "cytoscape-elk";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { Portal } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SetRequired } from "type-fest";

import "cytoscape-context-menus/cytoscape-context-menus.css";
import {
  carrot,
  nephritis,
  peterRiver,
  pomegranate,
  sunflower,
} from "../colors";
import reactNodes from "../cytoscape/reactNodes";
import DebugElementDialog from "./DebugElementDialog";
import "./GraphView.scss";
import PropositionAppearanceDialog, {
  OnFocusMediaExcerpt,
} from "./PropositionAppearanceDialog";
import {
  BasisOutcome,
  JustificationOutcome,
  outcomeValence,
  Entity,
  MediaExcerpt,
  preferredUrl,
  Proposition,
  EntityType,
} from "@sophistree/common";
import {
  AppearanceInfo,
  EntityElementData,
  PropositionNodeData,
} from "./graphTypes";

cytoscape.use(elk);
cytoscape.use(contextMenus);
cytoscape.use(reactNodes);

const zoomFactor = 0.03;
const zoomInFactor = 1 + zoomFactor;
const zoomOutFactor = 1 - zoomFactor;
const layoutAnimationDuration = 250;

interface GraphViewProps {
  id?: string;
  style?: CSSProperties;
  entities: Entity[];
  selectedEntityIds: string[];
  outcomes: Outcomes;
  logger: Logger;
  onSelectEntities: OnSelectEntities;
  onResetSelection: OnResetSelection;
  onAddNewProposition?: OnAddNewProposition;
  onDeleteEntity?: OnDeleteEntity;
  onCompleteDrag?: OnCompleteDrag;
  onFocusMediaExcerpt: OnFocusMediaExcerpt;
}

interface Outcomes {
  basisOutcomes: Map<string, BasisOutcome>;
  justificationOutcomes: Map<string, JustificationOutcome>;
}

const nodeOutcomeClasses = [
  "node-outcome-positive",
  "node-outcome-negative",
  "node-outcome-neutral",
  "node-outcome-contradictory",
];
const edgeOutcomeClasses = [
  "edge-outcome-positive",
  "edge-outcome-negative",
  "edge-outcome-neutral",
];
const outcomeClasses = [...nodeOutcomeClasses, ...edgeOutcomeClasses];
const syncClasses = ["hover-highlight", "dragging", ...nodeOutcomeClasses];

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

  useOutcomes(cyRef, outcomes);
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
    logger,
  );

  const { zoomIn, zoomOut } = useZoomEventHandlers(cyRef, logger);

  const layoutGraph = useCallback((fit = false) => {
    cyRef.current?.layout(getLayout(fit)).run();
  }, []);

  useContextMenus(
    cyRef,
    onDeleteEntity,
    onAddNewProposition,
    zoomIn,
    zoomOut,
    setDebugElementData,
    layoutGraph,
  );
  useSelectionEventHandlers(cyRef, onSelectEntities, onResetSelection);
  useDblTapToCreateNode(cyRef, onAddNewProposition);
  useDragEventHandlers(cyRef, onCompleteDrag);
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
      </Portal>
    </>
  );
}

function useElements(
  entities: Entity[],
  selectedEntityIds: string[],
  logger: Logger,
) {
  return useMemo(
    () => makeElements(entities, selectedEntityIds, logger),
    [entities, selectedEntityIds, logger],
  );
}

function useOutcomes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  { basisOutcomes, justificationOutcomes }: Outcomes,
) {
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.elements()
      .removeClass(outcomeClasses)
      .data({ outcome: undefined, valence: undefined });

    const elementsByEntityId = cy.elements().reduce((acc, element) => {
      const entityId = getEntityId(element);
      if (!entityId) {
        return acc;
      }
      const elements = acc.get(entityId) ?? [];
      elements.push(element);
      acc.set(entityId, elements);
      return acc;
    }, new Map<string, SingularElementArgument[]>());

    [basisOutcomes, justificationOutcomes].forEach((outcomes) => {
      outcomes.forEach((outcome, entityId) => {
        const elements = elementsByEntityId.get(entityId);
        if (!elements) {
          return;
        }

        const { nodeClass, edgeClass, valence } = makeOutcomeClasses(outcome);
        elements.forEach((element) => {
          element.data("outcome", outcome);
          element.data("valence", valence);
          if (element.isNode()) {
            element.addClass(nodeClass);
          } else {
            element.addClass(edgeClass);
          }
        });
      });
    });
  }, [cyRef, basisOutcomes, justificationOutcomes]);
}

function useSelectedNodes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  selectedEntityIds: string[],
) {
  useEffect(() => {
    cyRef.current
      ?.elements()
      .filter((n) => !selectedEntityIds.includes(getEntityId(n)))
      .unselect();
    if (selectedEntityIds.length) {
      cyRef.current
        ?.elements()
        .filter((n) => selectedEntityIds.includes(getEntityId(n)))
        .select();
    }
  }, [cyRef, selectedEntityIds]);
}

function usePanToFocusedNodes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  focusedNodeIds: string[],
) {
  /**
   * Pan the graph to include the given nodes. Currently just centers
   * on the nodes. I'd prefer to pan the minimum amount to include the
   * nodes (with some padding) and also decrease the zoom as necessary to
   * encompass all the nodes, but I couldn't figure out how to do that. The
   * algorithm could go like:
   *
   * - Calculate the bounding box of the nodes with padding.
   * - if the view already contains the bounding box, return.
   * - Otherwise, find the first corner of the view that needs to be moved
   *   to encompass the boundign box. Update the view to move the corner
   *   to match the corresponding corner of the bounding box without affecting
   *   the zoom.
   * - If any of the other 3 corners of the bounding box are outside the view,
   *   update the zoom so that the view encompasses the bounding box.
   *
   * Animating that is tricky because it requires zooming around a point
   * intermediate of the current center and the desired center.
   */
  const panToNodes = useCallback(
    (nodeIds: string[]) => {
      const cy = cyRef.current;
      if (!cy) return;

      const nodes = cy.nodes().filter((node) => nodeIds.includes(node.id()));
      if (nodes.length === 0) return;

      const nodesBoundingBox = nodes.boundingBox();
      const padding = 50;

      const extent = cy.extent();
      const viewIncludesNodes =
        nodesBoundingBox.x1 - padding >= extent.x1 &&
        nodesBoundingBox.x2 + padding <= extent.x2 &&
        nodesBoundingBox.y1 - padding >= extent.y1 &&
        nodesBoundingBox.y2 + padding <= extent.y2;

      if (!viewIncludesNodes) {
        cy.animate({ center: { eles: nodes }, duration: 300 });
      }
    },
    [cyRef],
  );

  useEffect(() => {
    if (focusedNodeIds.length) {
      panToNodes(focusedNodeIds);
    }
  }, [focusedNodeIds, panToNodes]);
}

function useReactNodes(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  setVisitAppearancesDialogProposition: (
    data: PropositionNodeData | undefined,
  ) => void,
  onFocusMediaExcerpt: OnFocusMediaExcerpt,
  logger: Logger,
) {
  const reactNodesConfig = useMemo(
    () => [
      {
        query: `node[entity.type="Proposition"]`,
        template: function (data: NodeDataDefinition) {
          const nodeData = data as PropositionNodeData;
          const appearanceCount = nodeData.appearances?.length;
          const appearanceNoun =
            "appearance" + (appearanceCount === 1 ? "" : "s");
          return (
            <>
              {appearanceCount ? (
                <span
                  title={`${appearanceCount} ${appearanceNoun}`}
                  className={cn("appearances-icon", {
                    selected: nodeData.isAnyAppearanceSelected,
                  })}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setVisitAppearancesDialogProposition(nodeData);
                  }}
                >
                  <Icon name="crosshairs-gps" />
                  {appearanceCount}
                </span>
              ) : undefined}
              <p>{nodeData.entity.text}</p>
            </>
          );
        },
        mode: "replace" as const,
        syncClasses,
        containerCSS: {
          padding: "1em",
          borderRadius: "8px",
          fontFamily: "Roboto",
        },
      },
      {
        query: `node[entity.type="MediaExcerpt"]`,
        template: function (data: NodeDataDefinition) {
          const mediaExcerpt = data.entity as MediaExcerpt;
          const url = preferredUrl(mediaExcerpt.urlInfo);
          return (
            <>
              <p>{mediaExcerpt.quotation}</p>
              <a
                href={url}
                title={url}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFocusMediaExcerpt(mediaExcerpt);
                  return false;
                }}
              >
                {mediaExcerpt.sourceInfo.name}
              </a>
            </>
          );
        },
        mode: "replace" as const,
        syncClasses,
        containerCSS: {
          padding: "1em",
          backgroundColor: peterRiver,
          borderRadius: "8px",
          fontFamily: "Roboto",
        },
      },
    ],
    [setVisitAppearancesDialogProposition, onFocusMediaExcerpt],
  );

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.reactNodes({
        layoutOptions: getLayout(false),
        nodes: reactNodesConfig,
        logger,
      });
    }
  }, [cyRef, reactNodesConfig, logger]);
}

function useZoomEventHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  logger: Logger,
) {
  const zoom = useCallback(
    ({
      level,
      renderedPosition,
    }: {
      level: number;
      renderedPosition: { x: number; y: number };
    }) => {
      const cy = cyRef.current;
      if (!cy) {
        logger.warn("Cannot zoom because there is no cy ref.");
        return;
      }
      cy.zoom({ level, renderedPosition });
    },
    [cyRef, logger],
  );

  const zoomByFactor = useCallback(
    (factor: number, renderedPosition: { x: number; y: number }) => {
      const cy = cyRef.current;
      if (!cy) {
        logger.warn("Cannot zoom because there is no cy ref.");
        return;
      }
      const level = cy.zoom() * factor;
      zoom({ level, renderedPosition });
    },
    [cyRef, zoom, logger],
  );

  const zoomIn = useCallback(
    (event: EventObject) => {
      zoomByFactor(zoomInFactor ** 5, {
        x: event.position?.x,
        y: event.position?.y,
      });
    },
    [zoomByFactor],
  );

  const zoomOut = useCallback(
    (event: EventObject) => {
      zoomByFactor(zoomOutFactor ** 5, {
        x: event.position?.x,
        y: event.position?.y,
      });
    },
    [zoomByFactor],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (!cyRef.current) return;

      const cy = cyRef.current;
      const delta = event.deltaY;
      const deltaX = event.deltaX;

      if (event.ctrlKey || event.metaKey) {
        // Pinch zoom
        const zoomFactor = delta > 0 ? zoomOutFactor : zoomInFactor;
        zoomByFactor(zoomFactor, { x: event.offsetX, y: event.offsetY });
      } else {
        // Pan
        cy.panBy({ x: -deltaX, y: -delta });
      }
    },
    [cyRef, zoomByFactor],
  );

  const handleGesture = useCallback(
    (e: Event) => {
      const event = e as GestureEvent;
      event.preventDefault();
      if (!cyRef.current) return;

      const scale = event.scale;

      zoomByFactor(scale, { x: event.offsetX, y: event.offsetY });
    },
    [cyRef, zoomByFactor],
  );

  useEffect(() => {
    const container = cyRef.current?.container();
    if (container) {
      container.addEventListener("wheel", handleWheel);
      container.addEventListener("gesturestart", handleGesture);
      container.addEventListener("gesturechange", handleGesture);
      container.addEventListener("gestureend", handleGesture);
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("gesturestart", handleGesture);
        container.removeEventListener("gesturechange", handleGesture);
        container.removeEventListener("gestureend", handleGesture);
      }
    };
  }, [cyRef, handleWheel, handleGesture]);

  return { zoomIn, zoomOut };
}

function useContextMenus(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onDeleteEntity: OnDeleteEntity | undefined,
  onAddNewProposition: OnAddNewProposition | undefined,
  zoomIn: EventHandler,
  zoomOut: EventHandler,
  setDebugElementData: (data: ElementDataDefinition | undefined) => void,
  layoutGraph: (fit?: boolean) => void,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;
    const menuItems = [
      onDeleteEntity && {
        id: "delete",
        content: "Delete",
        tooltipText: "Delete node",
        selector: "node, edge",
        onClickFunction: function (e: EventObjectNode | EventObjectEdge) {
          const target = e.target;
          const id = getEntityId(target);
          onDeleteEntity(id);
        },
        hasTrailingDivider: true,
      },
      onAddNewProposition && {
        id: "add-proposition",
        content: "Add proposition",
        tooltipText: "Add a proposition",
        selector: "",
        coreAsWell: true,
        onClickFunction: (event: EventObject) => {
          if (event.target === cy) {
            onAddNewProposition();
          }
        },
      },
      {
        id: "zoom-out",
        content: "Zoom out",
        selector: "*",
        coreAsWell: true,
        onClickFunction: zoomOut,
      },
      {
        id: "zoom-in",
        content: "Zoom in",
        selector: "*",
        coreAsWell: true,
        onClickFunction: zoomIn,
      },
      {
        id: "fit-to-contents",
        content: "Fit to contents",
        selector: "*",
        coreAsWell: true,
        tooltipText: "Layout the graph to fit to all contents",
        onClickFunction: () => layoutGraph(true),
      },
      {
        id: "show-element-data",
        content: "Show element data",
        selector: "node, edge",
        tooltipText: "Show element data for debugging",
        onClickFunction: (e: EventObjectNode | EventObjectEdge) => {
          setDebugElementData(e.target.data() as ElementDataDefinition);
        },
      },
    ].filter(Boolean) as MenuItem[];
    cy.contextMenus({
      menuItems,
    });
  }, [
    cyRef,
    zoomIn,
    zoomOut,
    layoutGraph,
    setDebugElementData,
    onAddNewProposition,
    onDeleteEntity,
  ]);
}

function useSelectionEventHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onSelectEntities: OnSelectEntities,
  onResetSelection: OnResetSelection,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    const tapNodeHandler = (event: EventObjectNode) => {
      const entityId = getEntityId(event.target);
      onSelectEntities([entityId]);
    };
    cy.on("tap", "node", tapNodeHandler);

    const tapEdgeHandler = (event: EventObjectNode) => {
      const entityId = getEntityId(event.target);
      onSelectEntities([entityId]);
    };
    cy.on("tap", "edge", tapEdgeHandler);

    const tapHandler = (event: EventObject) => {
      if (event.target === cy) {
        onResetSelection();
      }
    };
    cy.on("tap", tapHandler);
    return () => {
      cy.off("tap", "node", tapNodeHandler);
      cy.off("tap", "edge", tapEdgeHandler);
      cy.off("tap", tapHandler);
    };
  });
}

function useDblTapToCreateNode(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onAddNewProposition: OnAddNewProposition | undefined,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    const dbltapHandler = (event: EventObject) => {
      if (event.target === cy) {
        onAddNewProposition?.();
      }
    };
    cy.on("dbltap", dbltapHandler);
    return () => {
      cy.off("dbltap", dbltapHandler);
    };
  });
}

function useDragEventHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  onCompleteDrag: OnCompleteDrag | undefined,
) {
  useEffect(() => {
    if (!cyRef.current) {
      return;
    }
    const cy = cyRef.current;

    let dragSource = undefined as NodeSingular | undefined;
    let dragSourceOriginalPosition: Position | undefined;
    const mouseDownOnNodeHandler = (event: cytoscape.EventObjectNode) => {
      dragSource = event.target;
      dragSourceOriginalPosition = { ...dragSource.position() };
      dragSource.ancestors().add(dragSource).addClass("dragging");
    };

    // Store mousePosition for drags because using event.position caused weird
    // behavior when dragging nodes.
    let mousePosition: Position = { x: 0, y: 0 };
    const mouseMoveHandler = (event: EventObject) => {
      mousePosition = event.position;
    };

    const dragNodeHandler = (event: EventObjectNode) => {
      cy.elements(".hover-highlight").removeClass("hover-highlight");

      const hoverTarget = getClosestValidDropTarget(
        cy,
        mousePosition,
        event.target,
      );
      if (
        hoverTarget &&
        dragSource &&
        isValidDropTarget(dragSource, hoverTarget)
      ) {
        // Highlight the entity everywhere. In particular, highlight the justification node and
        // two edges when any one of them is hovered.
        const hoverEntityId = getEntityId(hoverTarget);
        cy.elements()
          .filter((e) => e.data("entity.id") === hoverEntityId)
          .addClass("hover-highlight");
      }
    };

    const mouseUpHandler = (event: EventObject) => {
      if (event.target === cy) {
        if (dragSource && dragSourceOriginalPosition) {
          // Return the node to its original position
          dragSource.position(dragSourceOriginalPosition);
        }
        dragSource = undefined;
        dragSourceOriginalPosition = undefined;
        cy.nodes().removeClass("hover-highlight");
        return;
      }

      if (dragSource) {
        dragSource.ancestors().add(dragSource).removeClass("dragging");
        const dragTarget = getClosestValidDropTarget(
          cy,
          mousePosition,
          dragSource,
        );
        if (dragTarget && isValidDropTarget(dragSource, dragTarget)) {
          onCompleteDrag?.({
            sourceId: getEntityId(dragSource),
            targetId: getEntityId(dragTarget),
          });
          if (
            dragSourceOriginalPosition &&
            getEntityType(dragSource) === "Proposition" &&
            getEntityType(dragTarget) === "MediaExcerpt"
          ) {
            dragSource.position(dragSourceOriginalPosition);
          }
        } else if (dragSourceOriginalPosition) {
          // Return the node to its original position
          dragSource.position(dragSourceOriginalPosition);
        }
      }
      dragSource = undefined;
      dragSourceOriginalPosition = undefined;
      cy.elements().removeClass("hover-highlight");
    };

    cy.on("mousedown", "node", mouseDownOnNodeHandler);
    cy.on("mousemove", mouseMoveHandler);
    cy.on("drag", "node", dragNodeHandler);
    cy.on("mouseup", mouseUpHandler);

    return () => {
      cy.off("mousedown", "node", mouseDownOnNodeHandler);
      cy.off("mousemove", mouseMoveHandler);
      cy.off("drag", "node", dragNodeHandler);
      cy.off("mouseup", mouseUpHandler);
    };
  }, [cyRef, onCompleteDrag]);
}

function useLayoutOnceUponInitialLoad(
  cyRef: React.MutableRefObject<cytoscape.Core | undefined>,
  layoutGraph: (fit?: boolean) => void,
) {
  // Fit the graph once on load
  const initialFit = useCallback(() => {
    layoutGraph(true);
    cyRef.current?.off("layoutstop", initialFit);
  }, [cyRef, layoutGraph]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.on("layoutstop", initialFit);

    return () => {
      cy.off("layoutstop", initialFit);
    };
  }, [cyRef, initialFit]);
}

/** Creates the Cytoscape elements for displaying the entities as a graph. Also returns
 * the focused node ids, which are the nodes that should be centered in the graph.
 *
 * @param entities The entities to display
 * @param selectedEntityIds The ids of the entities that are selected
 * @returns The Cytoscape elements and the focused node ids
 */
function makeElements(
  entities: Entity[],
  selectedEntityIds: string[],
  logger: Logger,
) {
  const { nodes: nodeDatas, edges: edgeDatas } = getNodesAndEdges(
    entities,
    selectedEntityIds,
    logger,
  );
  const focusedNodeIds = nodeDatas.reduce((acc, nodeData) => {
    if (selectedEntityIds.includes(nodeData.entity.id)) {
      acc.push(nodeData.id);
    }
    if (nodeData.type === "Proposition" && nodeData.isAnyAppearanceSelected) {
      acc.push(nodeData.id);
    }
    return acc;
  }, [] as string[]);

  const elements: ElementDefinition[] = [...nodeDatas, ...edgeDatas].map(
    (data) => ({
      data,
    }),
  );

  return { elements, focusedNodeIds };
}

function getNodesAndEdges(
  entities: Entity[],
  selectedEntityIds: string[],
  logger: Logger,
) {
  const {
    visibleEntityIds,
    mediaExcerptsById,
    propositionsById,
    justificationTargetIds,
  } = entities.reduce(
    (acc, e) => {
      switch (e.type) {
        case "MediaExcerpt":
          acc.mediaExcerptsById.set(e.id, e);
          break;
        case "Proposition":
          acc.propositionsById.set(e.id, e);
          break;
        case "Justification":
          acc.justificationTargetIds.add(e.targetId);
          break;
        case "Appearance":
        case "PropositionCompound":
          // Nothing to do.
          break;
      }
      if (
        (e.explicitVisibility ?? e.autoVisibility ?? "Visible") === "Visible"
      ) {
        acc.visibleEntityIds.add(e.id);
      }
      return acc;
    },
    {
      mediaExcerptsById: new Map<string, MediaExcerpt>(),
      propositionsById: new Map<string, Proposition>(),
      visibleEntityIds: new Set<string>(),
      justificationTargetIds: new Set<string>(),
    },
  );

  const {
    propositionCompoundAtomNodeIds,
    propositionIdToAppearanceInfos,
    justificationTargetNodeIds,
    justificationBasisNodeIds,
    counteredJustificationIds,
  } = entities.reduce(
    (acc, entity) => {
      if (!visibleEntityIds.has(entity.id)) {
        return acc;
      }
      switch (entity.type) {
        case "Proposition":
          if (justificationTargetIds.has(entity.id)) {
            acc.justificationTargetNodeIds.set(
              entity.id,
              makeEntityNodeId(entity),
            );
          }
          break;
        case "PropositionCompound":
          acc.justificationBasisNodeIds.set(
            entity.id,
            makeEntityNodeId(entity),
          );
          entity.atomIds.forEach((atomId) => {
            const atomNodeId = `propositionCompound-${entity.id}-atom-${atomId}`;
            if (!acc.propositionCompoundAtomNodeIds.has(atomId)) {
              acc.propositionCompoundAtomNodeIds.set(atomId, new Map());
            }
            acc.propositionCompoundAtomNodeIds
              .get(atomId)
              ?.set(entity.id, atomNodeId);
          });
          break;
        case "MediaExcerpt":
          acc.justificationBasisNodeIds.set(
            entity.id,
            makeEntityNodeId(entity),
          );
          break;
        case "Justification":
          if (justificationTargetIds.has(entity.id)) {
            acc.counteredJustificationIds.add(entity.id);
            const intermediateNodeId = `justification-intermediate-node-${entity.id}`;
            acc.justificationTargetNodeIds.set(entity.id, intermediateNodeId);
          }
          break;
        case "Appearance": {
          const mediaExcerpt = mediaExcerptsById.get(entity.mediaExcerptId);
          if (mediaExcerpt) {
            const appearanceInfo = { id: entity.id, mediaExcerpt };
            const appearances =
              acc.propositionIdToAppearanceInfos.get(entity.apparitionId) || [];
            appearances.push(appearanceInfo);
            acc.propositionIdToAppearanceInfos.set(
              entity.apparitionId,
              appearances,
            );
          }
          break;
        }
      }
      return acc;
    },
    {
      propositionCompoundAtomNodeIds: new Map<string, Map<string, string>>(),
      propositionIdToAppearanceInfos: new Map<string, AppearanceInfo[]>(),
      justificationTargetNodeIds: new Map<string, string>(),
      justificationBasisNodeIds: new Map<string, string>(),
      counteredJustificationIds: new Set<string>(),
    },
  );

  const { nodes: visibleNodes, edges: allEdges } = entities.reduce(
    (acc, entity) => {
      if (!visibleEntityIds.has(entity.id)) {
        return acc;
      }
      switch (entity.type) {
        case "PropositionCompound": {
          const compoundNodeId = justificationBasisNodeIds.get(entity.id);
          if (!compoundNodeId) {
            logger.error(
              `Missing node ID for PropositionCompound ID ${entity.id}`,
            );
            break;
          }
          acc.nodes.push({
            id: compoundNodeId,
            entity,
          });

          entity.atomIds.forEach((atomId) => {
            const proposition = propositionsById.get(atomId);
            if (!proposition) {
              logger.error(
                `No Proposition found for PropositionCompound atom ID ${atomId}. This should be impossible.`,
              );
              return;
            }

            const appearances =
              propositionIdToAppearanceInfos.get(atomId) || [];
            const isAnyAppearanceSelected = appearances.some((a) =>
              selectedEntityIds.includes(a.id),
            );

            const atomNodeId = propositionCompoundAtomNodeIds
              .get(atomId)
              ?.get(entity.id);
            if (!atomNodeId) {
              logger.error(
                `No atom node ID found for PropositionCompound atom ID ${atomId}. This should be impossible.`,
              );
              return;
            }
            acc.nodes.push({
              ...proposition,
              id: atomNodeId,
              parent: compoundNodeId,
              entity: proposition,
              entityId: proposition.id,
              atomId,
              entityType: proposition.type,
              appearances,
              isAnyAppearanceSelected,
            });
          });
          break;
        }
        case "Justification": {
          const basisNodeId = justificationBasisNodeIds.get(entity.basisId);
          const targetNodeId = justificationTargetNodeIds.get(entity.targetId);
          if (!basisNodeId || !targetNodeId) {
            logger.error(
              `Missing node ID for justification ${entity.id}. Basis: ${entity.basisId}, Target: ${entity.targetId}`,
            );
            break;
          }

          let duplicatedPropositionCompoundAtomEdgeSource = basisNodeId;

          if (counteredJustificationIds.has(entity.id)) {
            const intermediateNodeId = justificationTargetNodeIds.get(
              entity.id,
            );
            if (!intermediateNodeId) {
              logger.error(
                `Missing intermediate node ID for justification ID ${entity.id}`,
              );
              break;
            }
            duplicatedPropositionCompoundAtomEdgeSource = intermediateNodeId;

            acc.nodes.push({
              id: intermediateNodeId,
              entity,
              entityId: entity.id,
              entityType: entity.type,
              polarity: entity.polarity,
            });

            acc.edges.push({
              id: `justification-${entity.id}-countered-edge-1`,
              source: basisNodeId,
              target: intermediateNodeId,
              entity,
              entityId: entity.id,
              entityType: entity.type,
              polarity: entity.polarity,
              arrow: "none",
            });

            acc.edges.push({
              id: `justification-${entity.id}-countered-edge-2`,
              source: intermediateNodeId,
              target: targetNodeId,
              entity,
              entityId: entity.id,
              entityType: entity.type,
              polarity: entity.polarity,
            });
          } else {
            acc.edges.push({
              id: `justification-${entity.id}-edge`,
              source: basisNodeId,
              target: targetNodeId,
              entity,
              entityId: entity.id,
              entityType: entity.type,
              polarity: entity.polarity,
            });
          }

          // Since we duplicate the proposition compound atoms, we must duplicate the
          // justification edges to them too.
          propositionCompoundAtomNodeIds
            .get(entity.targetId)
            ?.forEach((nodeId, compoundId) => {
              acc.edges.push({
                id: `justification-${entity.id}-compound-${compoundId}`,
                source: duplicatedPropositionCompoundAtomEdgeSource,
                target: nodeId,
                entity,
                entityId: entity.id,
                entityType: entity.type,
                polarity: entity.polarity,
              });
            });
          break;
        }
        case "Appearance":
          // Appearances do not get nodes or edges for now.
          break;
        case "Proposition": {
          if (propositionCompoundAtomNodeIds.has(entity.id)) {
            // Handled above as an atom.
            break;
          }

          const appearances =
            propositionIdToAppearanceInfos.get(entity.id) || [];
          const isAnyAppearanceSelected = appearances.some((a) =>
            selectedEntityIds.includes(a.id),
          );

          const id =
            justificationTargetNodeIds.get(entity.id) ||
            makeEntityNodeId(entity);
          acc.nodes.push({
            id,
            entity,
            entityId: entity.id,
            entityType: entity.type,
            appearances,
            isAnyAppearanceSelected,
          });
          break;
        }
        case "MediaExcerpt": {
          const id = justificationBasisNodeIds.get(entity.id);
          if (!id) {
            logger.error(
              `No node ID found for media excerpt ID ${entity.id}. This should be impossible.`,
            );
            break;
          }
          acc.nodes.push({
            id,
            entity,
            entityId: entity.id,
            entityType: entity.type,
          });
          break;
        }
      }
      return acc;
    },
    {
      nodes: [] as EntityNodeDataDefinition[],
      edges: [] as EntityEdgeDataDefinition[],
    },
  );

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = allEdges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target),
  );

  // Sort the nodes so that children will be ordered the same as their parents.
  const { sortedNodes, sortedEdges } = sortNodesByInverseDfs(
    visibleNodes,
    visibleEdges,
    logger,
  );

  return { nodes: sortedNodes, edges: sortedEdges };
}

/** Inverse because our edges point from children to parents. */
function sortNodesByInverseDfs(
  nodes: EntityNodeDataDefinition[],
  edges: EntityEdgeDataDefinition[],
  logger: Logger,
) {
  // Start with all nodes potentially roots
  const rootIds = new Set(nodes.map((n) => n.id));

  // Create adjacencies for all the edges
  const adjacencyList = new Map<string, string[]>();
  edges.forEach(({ source, target }) => {
    if (!adjacencyList.has(target)) {
      adjacencyList.set(target, []);
    }
    adjacencyList.get(target)!.push(source);

    rootIds.delete(source);
  });

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  // Create adjacencies between PropositionCompounds and their atoms.
  const nodeIdByParentAndEntityId = new Map(
    nodes.map((n) => {
      const parentEntityId = n.parent
        ? nodesById.get(n.parent)!.entity.id
        : "noParent";
      return [`${parentEntityId}-${n.entity.id}`, n.id];
    }),
  );
  nodes.forEach((node) => {
    if (node.entity.type === "PropositionCompound") {
      adjacencyList.set(
        node.id,
        node.entity.atomIds.map(
          (id) => nodeIdByParentAndEntityId.get(`${node.entity.id}-${id}`)!,
        ),
      );
    }
  });

  // Perform DFS to sort nodes
  const edgeMap = new Map<string, EntityEdgeDataDefinition>();
  edges.forEach((edge) => {
    const key = `${edge.source}-${edge.target}`;
    edgeMap.set(key, edge);
  });

  const sortedNodes: EntityNodeDataDefinition[] = [];
  const sortedEdges: EntityEdgeDataDefinition[] = [];

  const visited = new Set<string>();
  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodesById.get(nodeId);
    if (node) {
      sortedNodes.push(node);
    } else {
      logger.error(`Didn't find node ID ${nodeId} during DFS`);
    }

    const neighbors = adjacencyList.get(nodeId) || [];
    neighbors.forEach((neighborId) => {
      // Look up the edge in constant time
      const edge = edgeMap.get(`${neighborId}-${nodeId}`);
      if (edge) {
        sortedEdges.push(edge);
      }
      dfs(neighborId);
    });
  }

  rootIds.forEach((rootId) => {
    dfs(rootId);
  });

  return { sortedNodes, sortedEdges };
}

function makeEntityNodeId({ type, id }: Entity) {
  return `${type}-${id}`;
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

const stylesheet: cytoscape.Stylesheet[] = [
  {
    selector: "node",
    style: {
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": "200px",
    } as const,
  },
  {
    selector: 'node[entity.type="Proposition"]',
    style: {
      shape: "round-rectangle",
      label: "data(entity.text)",
      width: "label",
    },
  },
  {
    selector: `node[entity.type="Proposition"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: `node[entity.type="MediaExcerpt"]`,
    style: {
      shape: "round-rectangle",
      label: "data(entity.quotation)",
      width: "label",
    },
  },
  {
    selector: `node[entity.type="MediaExcerpt"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: `edge`,
    style: {
      width: 2,
      "line-color": "#ccc",
      "target-arrow-color": "#ccc",
      "target-arrow-shape": (edge) =>
        edge.data("polarity") === "Positive" ? "triangle-backcurve" : "tee",
      "line-style": (edge) => {
        return edge.data("outcome") === "Invalid" ? "dashed" : "solid";
      },
      "line-dash-pattern": [20, 10],
      "arrow-scale": 1.5,
      "curve-style": "straight",
      "target-endpoint": "outside-to-node",
    },
  },
  {
    selector: `edge[arrow="none"]`,
    style: {
      "target-arrow-shape": "none",
    },
  },
  {
    selector: `node[entity.type="Justification"]`,
    style: {
      shape: "ellipse",
      width: "10px",
      height: "10px",
    },
  },
  {
    selector: `node[entity.type="Justification"][polarity="Positive"]`,
    style: {
      "background-color": nephritis,
    },
  },
  {
    selector: `node[entity.type="Justification"][polarity="Negative"]`,
    style: {
      "background-color": pomegranate,
    },
  },
  {
    selector: `edge[polarity="Positive"]`,
    style: {
      width: 2,
      "line-color": nephritis,
      "target-arrow-color": nephritis,
    },
  },
  {
    selector: `edge[polarity="Negative"]`,
    style: {
      width: 2,
      "line-color": pomegranate,
      "target-arrow-color": pomegranate,
    },
  },
  {
    // Include the polarity to have greater precedence.
    selector: `edge[polarity="Positive"]:selected, edge[polarity="Negative"]:selected`,
    style: {
      "line-color": sunflower,
      "target-arrow-color": sunflower,
      width: 4,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": sunflower,
    },
  },
  {
    selector: `.dragging[entity.type="Justification"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: `.dragging[entity.type="PropositionCompound"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: "node.hover-highlight",
    style: {
      "border-width": 3,
      "border-color": carrot,
    },
  },
  {
    selector: "edge.hover-highlight",
    style: {
      "line-color": carrot,
      "target-arrow-color": carrot,
      width: 4,
    },
  },
];

function nodeContainsPosition(node: NodeSingular, pos: Position) {
  const bb = node.boundingBox();
  return bb.x1 <= pos.x && pos.x <= bb.x2 && bb.y1 <= pos.y && pos.y <= bb.y2;
}

function nodeIncludesNode(node1: NodeSingular, node2: NodeSingular) {
  const bb1 = node1.boundingBox();
  const bb2 = node2.boundingBox();
  return (
    bb1.x1 <= bb2.x1 && bb2.x2 <= bb1.x2 && bb1.y1 <= bb2.y1 && bb2.y2 <= bb1.y2
  );
}

function getClosestValidDropTarget(
  cy: cytoscape.Core,
  position: Position,
  dragNode: NodeSingular,
) {
  const { excludedNodes, excludedEdges } = getExcludedElements(cy, dragNode);

  const nodeTarget = getInnermostNodeContainingPosition(
    cy,
    position,
    excludedNodes,
  );

  const closestEdge = getClosestEdge(cy, position, excludedEdges);

  if (nodeTarget && closestEdge) {
    const nodeZIndex = getZIndex(nodeTarget) ?? -Infinity;
    const edgeZIndex = getZIndex(closestEdge) ?? -Infinity;

    if (edgeZIndex > nodeZIndex) {
      return closestEdge;
    } else {
      return nodeTarget;
    }
  }

  return nodeTarget || closestEdge;
}

function getExcludedElements(cy: cytoscape.Core, dragNode: NodeSingular) {
  const dragNodeAndAncestors = dragNode.ancestors().union(dragNode);

  const justificationIds = cy.edges().reduce((ids, edge) => {
    if (
      edge.data("type") === "Justification" &&
      (dragNodeAndAncestors.contains(edge.source()) ||
        dragNodeAndAncestors.contains(edge.target()))
    ) {
      // This justification is already connected to the dragNode, so exclude all it's elements too.
      ids.add(getEntityId(edge));
      if (getEntityType(edge.target()) === "Justification") {
        // The dragNode is already targeting this justification, so exclude all it's elements too.
        ids.add(getEntityId(edge.target()));
      }
    }
    return ids;
  }, new Set<string>());

  // Exclude all elements corresponding to justificationIds and their targets
  const { excludedNodes, excludedEdges } = cy.elements().reduce(
    (acc, element) => {
      const entityId = getEntityId(element);
      if (justificationIds.has(entityId)) {
        if (element.isNode()) {
          acc.excludedNodes.add(element);
        } else if (element.isEdge()) {
          acc.excludedEdges.add(element);
          acc.excludedNodes.add(element.target());
        }
      }
      return acc;
    },
    {
      excludedNodes: new Set<NodeSingular>(),
      excludedEdges: new Set<EdgeSingular>(),
    },
  );

  // Add dragNode and its ancestors to excluded nodes
  dragNodeAndAncestors.forEach((node) => {
    excludedNodes.add(node);
  });

  return { excludedNodes, excludedEdges };
}

function getClosestEdge(
  cy: cytoscape.Core,
  position: Position,
  excludedEdges: Set<EdgeSingular>,
) {
  const distanceThreshold = 10;
  const angleThreshold = Math.PI / 2;

  const nodeTarget = getInnermostNodeContainingPosition(
    cy,
    position,
    new Set(),
  );
  // If the drag is over a node, exclude its edges too.
  nodeTarget
    ?.ancestors()
    .add(nodeTarget)
    .connectedEdges()
    .forEach((edge) => {
      excludedEdges.add(edge);
    });

  const closestEdge = cy.edges().reduce(
    (closest, edge) => {
      if (excludedEdges.has(edge)) {
        return closest;
      }

      const p1 = edge.source().position();
      const p2 = edge.target().position();
      const distance = distanceToLineSegment(p1, p2, position);

      // The distance is to the infinite line, not the finite line segment. We want to
      // exlude positions that are along the line but not close to the line segment.
      const angleBetweenPositionAndEndpoints = angleBetween(p1, position, p2);

      if (
        distance < distanceThreshold &&
        angleBetweenPositionAndEndpoints > angleThreshold &&
        (!closest.edge || distance < closest.distance)
      ) {
        return { edge, distance };
      }
      return closest;
    },
    { edge: undefined, distance: Infinity } as {
      edge: EdgeSingular | undefined;
      distance: number;
    },
  );
  return closestEdge.edge;
}

/** Returns the angle between the line segments p1p2 and p2p3. */
function angleBetween(p1: Position, p2: Position, p3: Position) {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const magnitudeProduct =
    Math.sqrt(v1.x * v1.x + v1.y * v1.y) * Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  return Math.acos(dotProduct / magnitudeProduct);
}

/**
 * Returns the minimum distance from a line segment defined by two points to a third point.
 *
 * See https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line#Line_defined_by_two_points
 */
function distanceToLineSegment(
  p1: Position,
  p2: Position,
  p: Position,
): number {
  const dy = p2.y - p1.y;
  const dx = p2.x - p1.x;
  const numerator = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
  const denominator = Math.sqrt(dy * dy + dx * dx);
  return numerator / denominator;
}

function getInnermostNodeContainingPosition(
  cy: cytoscape.Core,
  position: Position,
  excludedNodes: Set<NodeSingular>,
) {
  const node = cy
    .nodes()
    .reduce(
      (innermost, curr) =>
        !excludedNodes.has(curr) &&
        nodeContainsPosition(curr, position) &&
        (!innermost || nodeIncludesNode(innermost, curr))
          ? curr
          : innermost,
      undefined as NodeSingular | undefined,
    );
  return node;
}

const validPropositionDropTargets = new Set([
  "PropositionCompound",
  "Justification",
  "Proposition",
  "MediaExcerpt",
]);
const validMediaExcerptDropTarges = new Set(["Justification", "Proposition"]);

function isValidDropTarget(
  source: SingularElementArgument,
  target: SingularElementArgument,
): boolean {
  const sourceType = getEntityType(source);
  const targetType = getEntityType(target);

  switch (sourceType) {
    case "Proposition":
      return validPropositionDropTargets.has(targetType);
    case "MediaExcerpt":
      return validMediaExcerptDropTarges.has(targetType);
    default:
      return false;
  }
}

function getLayout(fit = false) {
  return {
    name: "elk",
    fit,
    animate: true,
    animationDuration: layoutAnimationDuration,
    // All options are available at http://www.eclipse.org/elk/reference.html
    //
    // 'org.eclipse.' can be dropped from the identifier. The subsequent identifier has to be used as property key in quotes.
    // E.g. for 'org.eclipse.elk.direction' use:
    // 'elk.direction'
    //
    // Enums use the name of the enum as string e.g. instead of Direction.DOWN use:
    // 'elk.direction': 'DOWN'
    //
    // The main field to set is `algorithm`, which controls which particular layout algorithm is used.
    // Example (downwards layered layout):
    elk: {
      algorithm: "layered",
      "elk.aspectRatio": "1.5",
      "elk.direction": "UP",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      // Make our DFS sorting control the node order.
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
      "elk.layered.crossingMinimization.greedySwitch.activation": "true",
      "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
      "elk.layered.crossingMinimization.greedySwitchHierarchical.type":
        "TWO_SIDED",
      "elk.layered.crossingMinimization.greedySwitchMaxIterations": "100",
      // Without this, parents seem to move when you add children to them
      // I.e. respects forceNodeModelOrder less.
      "elk.layered.crossingMinimization.semiInteractive": "true",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      "elk.spacing.nodeNode": "50",
    },
  };
}

type GestureEvent = Event & {
  scale: number;
  offsetX: number;
  offsetY: number;
};

function getEntityId(element: SingularElementArgument): string {
  const entityId = element.data("entity.id") as string | undefined;
  if (!entityId) {
    throw new Error(`entityId not found for element ID ${element.id()}`);
  }
  return entityId;
}

function getEntityType(element: SingularElementArgument): EntityType {
  const entityType = element.data("entity.type") as EntityType | undefined;
  if (!entityType) {
    throw new Error(`entityType not found for element ID ${element.id()}`);
  }
  return entityType;
}

type EntityNodeDataDefinition = SetRequired<NodeDataDefinition, "id"> &
  EntityElementData;
type EntityEdgeDataDefinition = SetRequired<EdgeDataDefinition, "id"> &
  EntityElementData;

function getZIndex(element: SingularElementArgument) {
  return element.style("z-index") as number | undefined;
}

function makeOutcomeClasses(outcome: BasisOutcome | JustificationOutcome) {
  const valence = outcomeValence(outcome);
  const nodeClass = `node-outcome-${valence}`;
  const edgeClass = `edge-outcome-${valence}`;
  return { nodeClass, edgeClass, valence };
}

export interface Logger {
  warn(message: string): void;
  error(message: string): void;
}

interface OnDeleteEntity {
  (entityId: string): void;
}

interface OnAddNewProposition {
  (): void;
}

interface OnSelectEntities {
  (entityIds: string[]): void;
}

interface OnResetSelection {
  (): void;
}

interface OnCompleteDrag {
  (ids: { sourceId: string; targetId: string }): void;
}
