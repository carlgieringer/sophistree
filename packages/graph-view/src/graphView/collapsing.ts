import { Entity, Justification } from "@sophistree/common";

export interface OnToggleCollapse {
  (entityId: string): void;
}

/**
 * - do a search where each entity ID is added to either or both local Sets collapsedDescendantIds
 *   and uncollapsedDescendantIds depending on whether it can be reached by a collapsed or
 *   uncollpsed node.
 * - Then remove IDs appearing in uncollapsedDescendantIds from collapsedDescendantIds. These are
 *   the nodes which will not appear in the graph because they are descendants only of collapsed
 *   node(s).
 * - Then do a bottom-up count collecting `{ childCount, descendantCount }` for each node. For
 *   childCount, count every child that is in collapsedDescendantIds. For descendantCount, sum
 *   descendantCount of each child that is in collapsedDescendantIds.
 * @param entities The full list of entities
 * @param visibleEntityIds The entities which are visible
 * @param collapsedEntityIds The entities that are explicitly collapsed.
 * @returns
 */
export function getCollapseInfo(entities: Entity[]) {
  const { rootIds, adjacencies, entitiesById } = makeAdjacencies(entities);
  const collapsedDescendantIds = getCollapsedDescendantIds(
    rootIds,
    adjacencies,
    entitiesById,
  );
  const collapsedDescendantCounts = getCollapsedDescendantCounts(
    entities,
    entitiesById,
    collapsedDescendantIds,
    adjacencies,
  );

  return { collapsedDescendantIds, collapsedDescendantCounts };
}

function makeAdjacencies(entities: Entity[]) {
  const rootIds = new Set<string>(entities.map((e) => e.id));
  const adjacencies = new Map<string, Set<string>>();
  const entitiesById = new Map<string, Entity>();
  const justifications = new Set<Justification>();
  for (const entity of entities) {
    entitiesById.set(entity.id, entity);
    switch (entity.type) {
      case "Justification": {
        // Handle justifications below after entitiesById is populated
        justifications.add(entity);
        break;
      }
      case "PropositionCompound": {
        adjacencies.set(entity.id, new Set(entity.atomIds));
        entity.atomIds.forEach((id) => rootIds.delete(id));
        break;
      }
      default:
        break;
    }
  }

  // Resolve counter-justification's ultimate node.
  for (const justification of justifications) {
    let target = justification as Entity;
    while (target.type === "Justification") {
      rootIds.delete(target.id);
      target = entitiesById.get(target.targetId)!;
    }
    if (!adjacencies.has(target.id)) {
      adjacencies.set(target.id, new Set());
    }
    adjacencies.get(target.id)!.add(justification.basisId);

    rootIds.delete(justification.basisId);
  }

  return { adjacencies, rootIds, entitiesById };
}

function getCollapsedDescendantIds(
  rootIds: Set<string>,
  adjacencies: Map<string, Set<string>>,
  entitiesById: Map<string, Entity>,
) {
  const collapsedDescendantIds = new Set<string>();
  const uncollapsedDescendantIds = new Set<string>();
  for (const rootId of rootIds) {
    visit(rootId);
  }

  function visit(id: string, isParentCollapsed: boolean = false) {
    if (uncollapsedDescendantIds.has(id)) {
      return;
    }
    const entity = entitiesById.get(id);
    if (!entity) {
      throw new Error(`Entity ${id} is missin from entitiesById`);
    }
    const { isCollapsed } = entity;
    if (isParentCollapsed) {
      collapsedDescendantIds.add(id);
    } else {
      uncollapsedDescendantIds.add(id);
    }
    for (const childId of adjacencies.get(id) ?? []) {
      visit(childId, isCollapsed || isParentCollapsed);
    }
  }

  for (const id of uncollapsedDescendantIds) {
    collapsedDescendantIds.delete(id);
  }

  return collapsedDescendantIds;
}

function getCollapsedDescendantCounts(
  entities: Entity[],
  entitiesById: Map<string, Entity>,
  collapsedDescendantIds: Set<string>,
  adjacencies: Map<string, Set<string>>,
) {
  const collapsedDescendantCounts = new Map<
    string,
    { childCount: number; descendantCount: number }
  >();

  for (const entity of entities) {
    visit(entity.id);
  }

  function visit(id: string) {
    if (collapsedDescendantCounts.has(id)) {
      return;
    }

    for (const childId of adjacencies.get(id) ?? []) {
      visit(childId);
    }

    const adjacents = adjacencies.get(id) ?? new Set();
    const childCount = [...adjacents]
      .map<number>((id) => (collapsedDescendantIds.has(id) ? 1 : 0))
      .reduce((a, b) => a + b, 0);
    const descendantCount = [...adjacents]
      .map((id) => {
        let descendantCount =
          collapsedDescendantCounts.get(id)?.descendantCount ?? 0;
        // PropositionCompounds do not contribute to descendantCounts since they don't convey
        // extra information beyond the atom propositions they contain.
        if (
          collapsedDescendantIds.has(id) &&
          entitiesById.get(id)?.type !== "PropositionCompound"
        ) {
          descendantCount += 1;
        }
        return descendantCount;
      })
      .reduce((a, b) => a + b, 0);
    collapsedDescendantCounts.set(id, {
      childCount,
      descendantCount,
    });
  }

  return collapsedDescendantCounts;
}
