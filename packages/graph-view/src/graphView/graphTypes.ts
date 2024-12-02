import { Entity, MediaExcerpt, Proposition } from "@sophistree/common";

export interface AppearanceInfo {
  id: string;
  mediaExcerpt: MediaExcerpt;
}

export interface EntityElementData<E extends Entity = Entity> {
  entity: E;
  // Whether this node is explicitly collapsed; it's descendants will
  // not appear unless they target other uncollapsed nodes.
  isCollapsed?: boolean;
  // The number of children hidden due to this node being collapsed. If
  // this node is not collpased, then this is undefined.
  collapsedChildCount?: number;
  // The number of descendants hidden due to this node being collapsed. If
  // this node is not collpased, then this is undefined.
  collapsedDescendantCount?: number;
}

export type PropositionNodeData = EntityElementData<Proposition> & {
  appearances: AppearanceInfo[] | undefined;
  isAnyAppearanceSelected: boolean;
};

export interface GraphViewLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
