import { RootState } from "./store";
import { Entity } from "./entitiesSlice";

const emptyEntities: Entity[] = [];

export const activeMapId = (state: RootState) => {
  return state.entities.activeMapId;
};

export const allMaps = (state: RootState) => {
  return state.entities.maps;
};

export const activeMap = (state: RootState) => {
  return allMaps(state).find((map) => map.id === activeMapId(state));
};

export const activeMapName = (state: RootState) => {
  return activeMap(state)?.name;
};

export const activeMapEntities = (state: RootState) => {
  return activeMap(state)?.entities || emptyEntities;
};

export const selectedEntityIds = (state: RootState) => {
  return state.entities.selectedEntityIds;
};

export const selectedEntities = (state: RootState) => {
  return activeMapEntities(state)?.find((entity) =>
    selectedEntityIds(state).includes(entity.id)
  );
};
