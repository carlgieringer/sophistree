import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { TextInput, Text } from "react-native-paper";
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
import * as selectors from "../store/selectors";

const EntityEditor: React.FC = () => {
  const selectedEntity = useSelector(selectors.selectedEntity);

  if (!selectedEntity) {
    return <Text>No entity selected</Text>;
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
      return <Text>Unknown entity type</Text>;
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
  return <Text>MediaExcerptEditor</Text>;
}

export default EntityEditor;
