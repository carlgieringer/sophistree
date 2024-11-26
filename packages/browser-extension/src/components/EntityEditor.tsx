import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { TextInput, Text } from "react-native-paper";
import { View } from "react-native";

import {
  Polarity,
  Entity,
  Proposition,
  Justification,
  MediaExcerpt,
} from "@sophistree/common";

import {
  updateJustification,
  updateProposition,
  updateMediaExerpt,
} from "../store/entitiesSlice";
import * as selectors from "../store/selectors";

const EntityEditor: React.FC = () => {
  const selectedEntities = useSelector(selectors.selectedEntities);
  if (selectedEntities.length < 1) {
    return <Text>No entity selected</Text>;
  }
  if (selectedEntities.length > 1) {
    return <Text>Multiple selected entities</Text>;
  }

  const [selectedEntity] = selectedEntities;
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
  return (
    <View>
      <TextInput
        value={entity.text}
        multiline={true}
        numberOfLines={1}
        onChangeText={(text) =>
          dispatch(updateProposition({ id: entity.id, updates: { text } }))
        }
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
  const dispatch = useDispatch();
  return (
    <View>
      <TextInput
        label="Source Title"
        placeholder="“The Title” The Publication (2024-10-01)"
        value={entity.sourceInfo.name}
        multiline={true}
        numberOfLines={1}
        onChangeText={(text) =>
          dispatch(
            updateMediaExerpt({
              id: entity.id,
              updates: { sourceInfo: { name: text } },
            }),
          )
        }
      />
    </View>
  );
}

export default EntityEditor;
