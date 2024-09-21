import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import { RootState } from "../store";
import { addEntity, selectEntity, Entity } from "../store/entitiesSlice";

const EntityList: React.FC = () => {
  const activeMapId = useSelector(
    (state: RootState) => state.entities.activeMapId
  );
  const entities = useSelector(
    (state: RootState) =>
      state.entities.maps.find((map) => map.id === activeMapId)?.entities || []
  );
  const dispatch = useDispatch();

  const handleAddEntity = () => {
    dispatch(
      addEntity({
        id: uuidv4(),
        type: "Proposition",
        text: "New Proposition",
      })
    );
  };

  return (
    <div>
      {entities.map((entity) => (
        <div key={entity.id} onClick={() => dispatch(selectEntity(entity.id))}>
          {makeDescription(entity)}
        </div>
      ))}
      <button onClick={handleAddEntity}>Add Proposition</button>
    </div>
  );
};

function makeDescription(entity: Entity): string {
  switch (entity.type) {
    case "Proposition":
      return `Proposition: ${entity.text}`;
    case "MediaExcerpt":
      return `MediaExcerpt: “${entity.quotation}” ${entity.sourceName}`;
    default:
      return `${entity.type}`;
  }
}

export default EntityList;
