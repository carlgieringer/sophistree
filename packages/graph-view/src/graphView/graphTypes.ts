import { Entity, MediaExcerpt, Proposition } from "@sophistree/common";

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

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
