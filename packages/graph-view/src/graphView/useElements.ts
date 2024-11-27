import {
  EdgeDataDefinition,
  ElementDefinition,
  NodeDataDefinition,
} from "cytoscape";
import { useMemo } from "react";
import { SetRequired } from "type-fest";

import { Entity, MediaExcerpt, Proposition } from "@sophistree/common";
import {
  AppearanceInfo,
  EntityElementData,
  GraphViewLogger,
} from "./graphTypes";

export function useElements(
  entities: Entity[],
  selectedEntityIds: string[],
  logger: GraphViewLogger,
) {
  return useMemo(
    () => makeElements(entities, selectedEntityIds, logger),
    [entities, selectedEntityIds, logger],
  );
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
  logger: GraphViewLogger,
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
  logger: GraphViewLogger,
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
              targetArrow: "none",
            });

            acc.edges.push({
              id: `justification-${entity.id}-countered-edge-2`,
              source: intermediateNodeId,
              target: targetNodeId,
              entity,
              entityId: entity.id,
              entityType: entity.type,
              polarity: entity.polarity,
              sourceArrow: "none",
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
  logger: GraphViewLogger,
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

type EntityNodeDataDefinition = SetRequired<NodeDataDefinition, "id"> &
  EntityElementData;
type EntityEdgeDataDefinition = SetRequired<EdgeDataDefinition, "id"> &
  EntityElementData;

function makeEntityNodeId({ type, id }: Entity) {
  return `${type}-${id}`;
}
