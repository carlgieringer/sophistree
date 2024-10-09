import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { TextInput, Text } from "react-native-paper";
import { View } from "react-native";
import debounce from "lodash.debounce";

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
  const selectedEntity = useSelector(selectors.selectedEntities);

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

  const [text, setText] = useState(entity.text);

  // For some reason the graph updates cause typing to be really laggy. So
  // throttle them.
  // TODO: #1 - Remove the throttle
  const dispatchEvent = debounce(function dispatchEvent(text: string) {
    dispatch(updateProposition({ id: entity.id, updates: { text } }));
  }, 500);
  function handleTextChange(text: string) {
    setText(text);
    dispatchEvent(text);
  }
  return (
    <View>
      <TextInput
        value={text}
        multiline={true}
        numberOfLines={1}
        onChangeText={handleTextChange}
      />
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
      }),
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
  return <Text>MediaExcerpt {entity.id}</Text>;
}

export default EntityEditor;
