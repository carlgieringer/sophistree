import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import {
  updateJustification,
  Polarity,
  Entity,
  Proposition,
  updateProposition,
  Justification,
  MediaExcerpt,
} from "../store/entitiesSlice";

const EntityEditor: React.FC = () => {
  const activeMapId = useSelector(
    (state: RootState) => state.entities.activeMapId
  );
  const selectedEntityId = useSelector(
    (state: RootState) => state.entities.selectedEntityId
  );
  const selectedEntity = useSelector((state: RootState) =>
    state.entities.maps
      .find((map) => map.id === activeMapId)
      ?.entities.find((entity) => entity.id === selectedEntityId)
  );

  if (!selectedEntity) {
    return <div>No entity selected</div>;
  }

  const editor = chooseEditor(selectedEntity);
  return editor;
};

function chooseEditor(entity: Entity) {
  switch (entity.type) {
    case "Proposition":
      return <PropositionEditor entity={entity} />;
    case "Justification":
      return <JustificationEditor entity={entity} />;
    case "MediaExcerpt":
      return <MediaExcerptEditor entity={entity} />;
    default:
      return <div>Unknown entity type</div>;
  }
}

function PropositionEditor({ entity }: { entity: Proposition }) {
  const dispatch = useDispatch();

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    dispatch(updateProposition({ id: entity.id, updates: { text } }));
  }
  return (
    <div>
      <input type="text" value={entity.text} onChange={handleTextChange} />
    </div>
  );
}

function JustificationEditor({ entity }: { entity: Justification }) {
  const dispatch = useDispatch();

  const handlePolarityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch(
      updateJustification({
        id: entity.id,
        updates: { polarity: e.target.value as Polarity },
      })
    );
  };
  return (
    <div>
      <select onChange={handlePolarityChange} value={entity.polarity}>
        <option value="Positive">Positive</option>
        <option value="Negative">Negative</option>
      </select>
    </div>
  );
}

function MediaExcerptEditor({ entity }: { entity: MediaExcerpt }) {
  return <div>MediaExcerptEditor</div>;
}

export default EntityEditor;
