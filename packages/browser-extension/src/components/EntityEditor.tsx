import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { TextInput, Text, Surface } from "react-native-paper";
import { View, StyleSheet } from "react-native";
import debounce from "lodash.debounce";

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
  const selectedEntities = useSelector(selectors.selectedEntitiesForEdit);
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
  const [text, setText] = useState(entity.text);

  const debouncedDispatch = useMemo(
    () =>
      debounce((text: string) => {
        dispatch(updateProposition({ id: entity.id, updates: { text } }));
      }, 150),
    [dispatch, entity.id],
  );

  const handleTextChange = (newText: string) => {
    setText(newText);
    debouncedDispatch(newText);
  };

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
  const dispatch = useDispatch();
  const [text, setText] = useState(entity.sourceInfo.name);

  const debouncedDispatch = useMemo(
    () =>
      debounce((text: string) => {
        dispatch(
          updateMediaExerpt({
            id: entity.id,
            updates: { sourceInfo: { name: text } },
          }),
        );
      }, 150),
    [dispatch, entity.id],
  );

  const handleTextChange = (newText: string) => {
    setText(newText);
    debouncedDispatch(newText);
  };

  return (
    <View>
      <TextInput
        label="Source Title"
        placeholder="“The Title” The Publication (2024-10-01)"
        value={text}
        multiline={true}
        numberOfLines={1}
        onChangeText={handleTextChange}
      />
      <Surface style={styles.quotationContainer}>
        <Text style={styles.quotationLabel}>Quotation</Text>
        <Text style={styles.quotationText}>{entity.quotation}</Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  quotationContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#757575",
  },
  quotationLabel: {
    fontSize: 12,
    color: "#757575",
    marginBottom: 8,
  },
  quotationText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#424242",
    userSelect: "text",
    fontStyle: "italic",
  },
});

export default EntityEditor;
