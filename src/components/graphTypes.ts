import { Entity, MediaExcerpt, Proposition } from "../store/entitiesSlice";

export interface AppearanceInfo {
  id: string;
  mediaExcerpt: MediaExcerpt;
}

export interface EntityElementData {
  entity: Entity;
}

export type PropositionNodeData = {
  entity: Proposition;
  appearances: AppearanceInfo[] | undefined;
  isAnyAppearanceSelected: boolean;
};
