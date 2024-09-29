import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import cytoscape, {
  NodeSingular,
  EventObjectNode,
  Position,
  EventObject,
  EdgeDataDefinition,
  NodeDataDefinition,
  ElementDefinition,
} from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import contextMenus from "cytoscape-context-menus";
import { v4 as uuidv4 } from "uuid";
import elk from "cytoscape-elk";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Portal } from "react-native-paper";
import cn from "classnames";
import { SetRequired } from "type-fest";

import reactNodes, { ReactNodeOptions } from "../cytoscape/reactNodes";
import {
  addEntity,
  completeDrag,
  selectEntities,
  deleteEntity,
  resetSelection,
  Entity,
  MediaExcerpt,
  defaultVisibilityProps,
  preferredUrl,
  Proposition,
} from "../store/entitiesSlice";
import {
  carrot,
  nephritis,
  peterRiver,
  pomegranate,
  sunflower,
} from "../colors";
import "cytoscape-context-menus/cytoscape-context-menus.css";
import "./GraphView.scss";
import { activeMapEntities } from "../store/selectors";
import * as selectors from "../store/selectors";
import VisitPropositionAppearanceDialog, {
  AppearanceInfo,
  activateMediaExcerpt,
  PropositionNodeData,
} from "./VisitPropositionAppearanceDialog";

cytoscape.use(elk);
cytoscape.use(contextMenus);
cytoscape.use(reactNodes);

const zoomFactor = 0.03;
const zoomInFactor = 1 + zoomFactor;
const zoomOutFactor = 1 - zoomFactor;

interface GraphViewProps {
  id?: string;
  style?: CSSProperties;
}

export default function GraphView({ id, style }: GraphViewProps) {
  const entities = useSelector(activeMapEntities);
  const selectedEntityIds = useSelector(selectors.selectedEntityIds);
  const { elements, focusedNodeIds } = useMemo(
    () => makeElements(entities, selectedEntityIds),
    [entities, selectedEntityIds]
  );

  const cyRef = useRef<cytoscape.Core | undefined>(undefined);

  if (cyRef.current) {
    correctInvalidNodes(cyRef.current, elements);
  }

  useEffect(() => {
    cyRef.current
      ?.nodes()
      .filter((n) => !selectedEntityIds.includes(n.data("entityId")))
      .unselect();
    if (selectedEntityIds.length) {
      cyRef.current
        ?.nodes()
        .filter((n) => selectedEntityIds.includes(n.data("entityId")))
        .select();
    }
  }, [selectedEntityIds]);

  useEffect(() => {
    if (focusedNodeIds.length) {
      panToNodes(focusedNodeIds);
    }
  }, [focusedNodeIds]);

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
  const panToNodes = useCallback((nodeIds: string[]) => {
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
  }, []);

  const [
    visitAppearancesDialogProposition,
    setVisitAppearancesDialogProposition,
  ] = useState(undefined as PropositionNodeData | undefined);

  const reactNodesConfig: ReactNodeOptions[] = [
    {
      query: `node[type="Proposition"]`,
      template: function (data: PropositionNodeData) {
        const appearanceCount = data.appearances?.length;
        const appearanceNoun =
          "appearance" + (appearanceCount === 1 ? "" : "s");
        return (
          <>
            {appearanceCount ? (
              <span
                title={`${appearanceCount} ${appearanceNoun}`}
                className={cn("appearances-icon", {
                  selected: data.isAnyAppearanceSelected,
                })}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setVisitAppearancesDialogProposition(data);
                }}
              >
                <Icon name="crosshairs-gps" />
                {appearanceCount}
              </span>
            ) : undefined}
            <p>{data.text}</p>
          </>
        );
      },
      mode: "replace",
      syncClasses: ["hover-highlight", "dragging"],
      containerCSS: {
        padding: "1em",
        backgroundColor: peterRiver,
        borderRadius: "8px",
      },
    },
    {
      query: `node[type="MediaExcerpt"]`,
      template: function (data: MediaExcerpt) {
        const url = preferredUrl(data.urlInfo);
        return (
          <>
            <p>{data.quotation}</p>
            <a
              href={url}
              title={url}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                activateMediaExcerpt(data);
                return false;
              }}
            >
              {data.sourceInfo.name}
            </a>
          </>
        );
      },
      mode: "replace",
      syncClasses: ["hover-highlight", "dragging"],
      containerCSS: {
        padding: "1em",
        backgroundColor: peterRiver,
        borderRadius: "8px",
      },
    },
  ];

  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.reactNodes({
        layout: getLayout(false),
        nodes: reactNodesConfig,
      });
    }
  }, [cyRef.current]);

  const zoomIn = useCallback((event: EventObject) => {
    zoomByFactor(zoomInFactor ** 5, {
      x: event.position?.x,
      y: event.position?.y,
    });
  }, []);

  const zoomOut = useCallback((event: EventObject) => {
    zoomByFactor(zoomOutFactor ** 5, {
      x: event.position?.x,
      y: event.position?.y,
    });
  }, []);

  const zoomByFactor = useCallback(
    (factor: number, renderedPosition: { x: number; y: number }) => {
      const cy = cyRef.current;
      if (!cy) {
        console.warn("Cannot zoom because there is no cy ref.");
        return;
      }
      const level = cy.zoom() * factor;
      zoom({ level, renderedPosition });
    },
    []
  );

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
        console.warn("Cannot zoom because there is no cy ref.");
        return;
      }
      cy.zoom({ level, renderedPosition });
    },
    []
  );

  const handleWheel = useCallback((event: WheelEvent) => {
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
  }, []);

  const handleGesture = useCallback((event: any) => {
    event.preventDefault();
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const scale = event.scale;

    zoomByFactor(scale, { x: event.offsetX, y: event.offsetY });
  }, []);

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
  }, [id, handleWheel, handleGesture]);

  const dispatch = useDispatch();
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;

      cy.contextMenus({
        menuItems: [
          {
            id: "delete",
            content: "Delete",
            tooltipText: "Delete node",
            selector: "node, edge",
            onClickFunction: function (event) {
              var target = event.target;
              const id = target.data("entityId");
              dispatch(deleteEntity(id));
            },
            hasTrailingDivider: true,
          },
          {
            id: "zoom-out",
            content: "Zoom out",
            selector: "*",
            onClickFunction: zoomOut,
            coreAsWell: true,
          },
          {
            id: "zoom-in",
            content: "Zoom in",
            selector: "*",
            onClickFunction: zoomIn,
            coreAsWell: true,
          },
          {
            id: "fit-to-contents",
            content: "Fit to contents",
            selector: "*",
            tooltipText: "Layout the graph to fit to all contents",
            onClickFunction: () => layoutGraph(true),
            coreAsWell: true,
          },
        ],
      });

      cy.on("tap", "node", (event: EventObjectNode) => {
        const entityId = event.target.data("entityId");
        dispatch(selectEntities([entityId]));
      });

      cy.on("tap", "edge", (event: EventObjectNode) => {
        const entityId = event.target.data("entityId");
        dispatch(selectEntities([entityId]));
      });

      cy.on("tap", (event: EventObject) => {
        if (event.target === cy) {
          dispatch(resetSelection());
        }
      });

      cy.on("dbltap", (event: EventObject) => {
        if (event.target === cy) {
          const newNode = {
            id: uuidv4(),
            type: "Proposition" as const,
            text: "New Node",
            ...defaultVisibilityProps,
          };
          dispatch(addEntity(newNode));
        }
      });

      let dragSource = undefined as NodeSingular | undefined;
      let dragSourceOriginalPosition: Position | undefined;
      cy.on("mousedown", "node", (event: cytoscape.EventObjectNode) => {
        dragSource = event.target;
        dragSourceOriginalPosition = { ...dragSource.position() };
        dragSource.ancestors().add(dragSource).addClass("dragging");
      });

      // Store mousePosition for drags because using event.position caused weird
      // behavior when dragging nodes.
      let mousePosition: Position = { x: 0, y: 0 };
      cy.on("mousemove", (event: EventObject) => {
        mousePosition = event.position;
      });

      cy.on("drag", "node", (event: EventObjectNode) => {
        const hoverNode = getInnermostNodeContainingNodesPosition(
          cy,
          mousePosition,
          event.target
        );
        cy.nodes(".hover-highlight").removeClass("hover-highlight");
        if (
          hoverNode &&
          dragSource &&
          isValidDropTarget(dragSource, hoverNode)
        ) {
          hoverNode.addClass("hover-highlight");
        }
      });

      cy.on("mouseup", "node", (event: any) => {
        if (dragSource) {
          dragSource.ancestors().add(dragSource).removeClass("dragging");
          const dragTargetNode = getInnermostNodeContainingNodesPosition(
            cy,
            mousePosition,
            dragSource
          );
          if (dragTargetNode && isValidDropTarget(dragSource, dragTargetNode)) {
            dispatch(
              completeDrag({
                sourceId: dragSource.data("entityId"),
                targetId: dragTargetNode.data("entityId"),
              })
            );
            if (
              dragSourceOriginalPosition &&
              dragSource.data().type === "Proposition" &&
              dragTargetNode.data().type === "MediaExcerpt"
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
        cy.nodes().removeClass("hover-highlight");
      });

      cy.on("mouseup", (event: EventObject) => {
        if (event.target === cy) {
          if (dragSource && dragSourceOriginalPosition) {
            // Return the node to its original position
            dragSource.position(dragSourceOriginalPosition);
          }
          dragSource = undefined;
          dragSourceOriginalPosition = undefined;
          cy.nodes().removeClass("hover-highlight");
        }
      });
    }
  }, [dispatch]);

  // Fit the graph once on load
  const initialFit = useCallback(() => {
    layoutGraph(true);
    cyRef.current?.off("layoutstop", initialFit);
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) {
      return;
    }
    cy.on("layoutstop", initialFit);
  }, []);

  useEffect(() => layoutGraph, [elements]);

  function layoutGraph(fit = false) {
    cyRef.current?.layout(getLayout(fit)).run();
  }

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
      {visitAppearancesDialogProposition && (
        <Portal>
          <VisitPropositionAppearanceDialog
            data={visitAppearancesDialogProposition}
            visible={!!visitAppearancesDialogProposition}
            onDismiss={() => setVisitAppearancesDialogProposition(undefined)}
          />
        </Portal>
      )}
    </>
  );
}

function makeElements(entities: Entity[], selectedEntityIds: string[]) {
  const { mediaExcerptsById, propositionsById, visibleEntityIds } =
    entities.reduce(
      (acc, e) => {
        switch (e.type) {
          case "MediaExcerpt":
            acc.mediaExcerptsById.set(e.id, e);
            break;
          case "Proposition":
            acc.propositionsById.set(e.id, e);
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
      }
    );

  const {
    propositionCompoundAtomNodeIds,
    canonicalJustificationByBasisId,
    propositionIdToAppearanceInfos,
    justificationTargetNodeIds,
  } = entities.reduce(
    (acc, entity) => {
      if (!visibleEntityIds.has(entity.id)) {
        return acc;
      }
      switch (entity.type) {
        case "Proposition":
          // Store proposition node IDs so that justifications can use them.
          acc.justificationTargetNodeIds.set(
            entity.id,
            `proposition-${entity.id}`
          );
          break;
        case "PropositionCompound":
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
        case "Justification":
          // Since the same basis can appear in multiple justifications, but we want
          // to display this as a single justification node with multiple edges
          // targeting each of the justification's targets, we choose the first justification
          // as the canonical one we will display.
          if (!acc.canonicalJustificationByBasisId.has(entity.basisId)) {
            const id = entity.id;
            const nodeId = `justification-node-${id}`;
            acc.canonicalJustificationByBasisId.set(entity.basisId, {
              id,
              nodeId,
            });
          }
          // This points all counter justifications at the canonical justification node.
          // To represent counter justifications properly, we must introduce intermediate
          // nodes along the edge path.
          acc.justificationTargetNodeIds.set(
            entity.id,
            acc.canonicalJustificationByBasisId.get(entity.basisId)!.nodeId
          );
          break;
        case "Appearance":
          const mediaExcerpt = mediaExcerptsById.get(entity.mediaExcerptId);
          if (mediaExcerpt) {
            const appearanceInfo = { id: entity.id, mediaExcerpt };
            const appearances =
              acc.propositionIdToAppearanceInfos.get(entity.apparitionId) || [];
            appearances.push(appearanceInfo);
            acc.propositionIdToAppearanceInfos.set(
              entity.apparitionId,
              appearances
            );
          }
          break;
      }
      return acc;
    },
    {
      // Proposition ID -> Proposition Compound ID -> Atom Node ID
      propositionCompoundAtomNodeIds: new Map<string, Map<string, string>>(),
      canonicalJustificationByBasisId: new Map<
        string,
        { id: string; nodeId: string }
      >(),
      propositionIdToAppearanceInfos: new Map<string, AppearanceInfo[]>(),
      justificationTargetNodeIds: new Map<string, string>(),
    }
  );

  const { nodes: visibleNodes, edges: allEdges } = entities.reduce(
    (acc, entity) => {
      if (!visibleEntityIds.has(entity.id)) {
        return acc;
      }
      switch (entity.type) {
        case "PropositionCompound": {
          const compoundNodeId = `propositionCompound-${entity.id}`;
          const parent = canonicalJustificationByBasisId.get(entity.id)?.nodeId;
          acc.nodes.push({
            ...entity,
            id: compoundNodeId,
            parent,
            entityId: entity.id,
          });

          entity.atomIds.forEach((atomId) => {
            const proposition = propositionsById.get(atomId);
            if (!proposition) {
              console.error(
                `No Proposition found for PropositionCompound atom ID ${atomId}. This should be impossible.`
              );
              return;
            }

            const appearances =
              propositionIdToAppearanceInfos.get(atomId) || [];
            const isAnyAppearanceSelected = appearances.some((a) =>
              selectedEntityIds.includes(a.id)
            );

            const atomNodeId = propositionCompoundAtomNodeIds
              .get(atomId)
              ?.get(entity.id);
            if (!atomNodeId) {
              console.error(
                `No atom node ID found for PropositionCompound atom ID ${atomId}. This should be impossible.`
              );
              return;
            }
            acc.nodes.push({
              ...proposition,
              id: atomNodeId,
              parent: compoundNodeId,
              entityId: proposition.id,
              atomId,
              appearances,
              isAnyAppearanceSelected,
            });
          });
          break;
        }
        case "Justification": {
          const canonicalJustificationInfo =
            canonicalJustificationByBasisId.get(entity.basisId);
          if (!canonicalJustificationInfo) {
            console.error(
              `No canonical justification found for basis ID ${entity.basisId}. This should be impossible.`
            );
            break;
          }
          const {
            id: canonicalJustificationId,
            nodeId: canonicalJustificationNodeId,
          } = canonicalJustificationInfo;

          if (canonicalJustificationId === entity.id) {
            acc.nodes.push({
              ...entity,
              id: canonicalJustificationNodeId,
              entityId: entity.id,
            });
          }

          const target = justificationTargetNodeIds.get(entity.targetId);
          if (!target) {
            console.error(
              `No target node ID found for justification target ID ${entity.targetId}. This should be impossible.`
            );
            break;
          }
          acc.edges.push({
            id: `justification-edge-${entity.id}`,
            entityId: entity.id,
            source: canonicalJustificationNodeId,
            target,
            polarity: entity.polarity,
          });

          // Since we duplicate the proposition compound atoms, we must duplicate the
          // justification edges to them too.
          propositionCompoundAtomNodeIds
            .get(entity.targetId)
            ?.forEach((nodeId, compoundId) => {
              acc.edges.push({
                id: `justification-${entity.id}-compound-${compoundId}`,
                entityId: entity.id,
                source: canonicalJustificationNodeId,
                target: nodeId,
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
            selectedEntityIds.includes(a.id)
          );

          const id = justificationTargetNodeIds.get(entity.id);
          if (!id) {
            console.error(
              `No node ID found for proposition ID ${entity.id}. This should be impossible.`
            );
            break;
          }
          acc.nodes.push({
            ...entity,
            id,
            entityId: entity.id,
            appearances,
            isAnyAppearanceSelected,
          });
          break;
        }
        case "MediaExcerpt": {
          const parent = canonicalJustificationByBasisId.get(entity.id)?.nodeId;
          acc.nodes.push({
            ...entity,
            id: `${entity.type}-${entity.id}`,
            parent,
            entityId: entity.id,
          });
          break;
        }
      }
      return acc;
    },
    {
      nodes: [] as SetRequired<NodeDataDefinition, "id">[],
      edges: [] as EdgeDataDefinition[],
    }
  );

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = allEdges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  const focusedNodeIds = visibleNodes.reduce((acc, node) => {
    if (selectedEntityIds.includes(node.entityId)) {
      acc.push(node.id);
    }
    if (node.type === "Proposition" && node.isAnyAppearanceSelected) {
      acc.push(node.id);
    }
    return acc;
  }, [] as string[]);

  const elements: ElementDefinition[] = [...visibleNodes, ...visibleEdges].map(
    (data) => ({ data })
  );

  return { elements, focusedNodeIds };
}

/** After we delete entities we need to remove them from Cytoscape */
function correctInvalidNodes(
  cy: cytoscape.Core,
  elements: cytoscape.ElementDefinition[]
) {
  const extantIds = elements.map((el) => el.data.id).filter((id) => id);

  // Remove invalid parents first. Otherwise the nodes disappear when we remove the
  // invalid parents below.
  const extantIdsSet = new Set(extantIds);
  cy.nodes().forEach((node) => {
    if (node.isChild() && !extantIdsSet.has(node.parent().first().data().id)) {
      node.move({ parent: null });
    }
  });

  const extantElementsSelector = extantIds.map((id) => `#${id}`).join(",");
  cy.elements().subtract(extantElementsSelector).remove();
}

const stylesheet = [
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
    selector: 'node[type="Proposition"]',
    style: {
      shape: "round-rectangle",
      label: "data(text)",
      width: "label",
      height: "label",
    },
  },
  {
    selector: `node[type="Proposition"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: 'node[type="Justification"]',
    style: {
      shape: "round-rectangle",
      "background-color": "#34495e",
      "compound-sizing-wrt-labels": "include",
      "padding-left": "10px",
      "padding-right": "10px",
      "padding-top": "10px",
      "padding-bottom": "10px",
    },
  },
  {
    selector: `node[type="MediaExcerpt"]`,
    style: {
      shape: "round-rectangle",
      label: "data(quotation)",
      width: "label",
      height: "label",
    },
  },
  {
    selector: `node[type="MediaExcerpt"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: `node[type="PropositionCompound"]`,
    style: {
      shape: "round-rectangle",
      "background-color": "#2980b9",
    },
  },
  {
    selector: `edge`,
    style: {
      width: 2,
      "line-color": "#ccc",
      "target-arrow-color": "#ccc",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.5,
      "curve-style": "straight",
      "target-endpoint": "outside-to-node",
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
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": sunflower,
    },
  },
  {
    selector: `.dragging[type="Justification"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: `.dragging[type="PropositionCompound"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: ".hover-highlight",
    style: {
      "border-width": 3,
      "border-color": carrot,
    },
  },
];

function layoutPropositionCompoundAtomsVertically(cy: cytoscape.Core) {
  const compoundNodes = cy
    .nodes()
    .filter(
      (entity) =>
        entity.isParent() && entity.data("type") === "PropositionCompound"
    );

  compoundNodes.forEach((compound) => {
    const children = compound.children();

    if (children.length <= 1) {
      return;
    }
    const compoundBbox = compound.boundingBox();

    let totalChildHeight = 0;
    let previousChildBottomMargin = 0;

    children.forEach((child, index) => {
      const childWidth = child.width();
      const childHeight = child.height();
      const leftPadding = getNumericStyle(child, "padding-left");
      const leftMargin = getNumericStyle(child, "margin-left");
      const topPadding = getNumericStyle(child, "padding-top");
      const topMargin = getNumericStyle(child, "margin-top");
      const bottomPadding = getNumericStyle(child, "padding-bottom");
      const bottomMargin = getNumericStyle(child, "margin-bottom");

      const xPosition =
        compoundBbox.x1 + leftMargin + leftPadding + childWidth / 2;

      let topOffset;
      if (index === 0) {
        topOffset = topMargin + topPadding;
      } else {
        const collapsedMargin = Math.max(previousChildBottomMargin, topMargin);
        topOffset = collapsedMargin + topPadding;
      }

      const yPosition =
        compoundBbox.y1 + totalChildHeight + topOffset + childHeight / 2;
      totalChildHeight += childHeight + topOffset + bottomPadding;
      child.position({
        x: xPosition,
        y: yPosition,
      });

      previousChildBottomMargin = bottomMargin;
    });

    const lastBottomMargin = getNumericStyle(children.last(), "margin-bottom");
    compound.style({
      width: compoundBbox.w,
      height: Math.max(compoundBbox.h, totalChildHeight + lastBottomMargin),
    });
  });
}

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

function getInnermostNodeContainingNodesPosition(
  cy: cytoscape.Core,
  position: Position,
  excludeNode: NodeSingular
) {
  const node = cy
    .nodes()
    .reduce(
      (innermost, curr) =>
        curr !== excludeNode &&
        !curr.edgesWith(excludeNode).length &&
        !excludeNode.ancestors().contains(curr) &&
        nodeContainsPosition(curr, position) &&
        (!innermost || nodeIncludesNode(innermost, curr))
          ? curr
          : innermost,
      undefined as NodeSingular | undefined
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
  source: NodeSingular,
  target: NodeSingular
): boolean {
  const sourceType = source.data("type");
  const targetType = target.data("type");

  switch (sourceType) {
    case "Proposition":
      return validPropositionDropTargets.has(targetType);
    case "MediaExcerpt":
      return validMediaExcerptDropTarges.has(targetType);
    default:
      return false;
  }
}

/**
 * Returns a numeric value for the given style property of the node.
 *
 * Cytoscape's node defines a getNumericStyle, but it throws for style names
 * that aren't defined directly. I.e. if you define `padding: 1em` and ask
 * for `padding-top`, it throws. node.style works for style names that are
 * not defined directly, but returns a string. This function works for both.
 */
function getNumericStyle(node: cytoscape.NodeSingular, name: string) {
  try {
    return styleLengthToPx(node.style(name));
  } catch {
    return 0;
  }
}

function styleLengthToPx(length: string | number): number {
  if (typeof length === "number") {
    return length;
  }
  if (length.endsWith("px")) {
    return parseFloat(length);
  }
  if (length.endsWith("em")) {
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    return parseFloat(length) * fontSize;
  }
  throw new Error(`Unsupported length unit: ${length}`);
}

function getLayout(fit = false) {
  return {
    name: "elk",
    fit,
    animate: true,
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
      "elk.direction": "UP",
      "elk.spacing.nodeNode": "50",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.aspectRatio": "1.5",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
  };
}
