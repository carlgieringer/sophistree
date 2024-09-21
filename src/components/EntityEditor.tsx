import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { TextInput } from "react-native-paper";
import { View } from "react-native";

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
    return <View>No entity selected</View>;
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
      return <View>Unknown entity type</View>;
  }
}

function PropositionEditor({ entity }: { entity: Proposition }) {
  const dispatch = useDispatch();

  function handleTextChange(text: string) {
    dispatch(updateProposition({ id: entity.id, updates: { text } }));
  }
  return (
    <View>
      <TextInput value={entity.text} onChangeText={handleTextChange} />
    </View>
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
    <View>
      <select onChange={handlePolarityChange} value={entity.polarity}>
        <option value="Positive">Positive</option>
        <option value="Negative">Negative</option>
      </select>
    </View>
  );
}

function MediaExcerptEditor({ entity }: { entity: MediaExcerpt }) {
  return <View>MediaExcerptEditor</View>;
}

export default EntityEditor;
