import React from "react";
import { Button, Dialog, TextInput } from "react-native-paper";
import { useDispatch } from "react-redux";

import { createMap } from "../store/entitiesSlice";

export default function NewMapDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const dispatch = useDispatch();

  const [mapName, setMapName] = React.useState("");

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
  }

  function handleCreateMap() {
    dispatch(createMap({ name: mapName }));
    setMapName("");
    hideModal();
  }

  return (
    <Dialog visible={visible} onDismiss={hideModal}>
      <Dialog.Title>Create new map</Dialog.Title>
      <Dialog.Content>
        <TextInput
          label="Map Name"
          value={mapName}
          onChangeText={(text) => setMapName(text)}
        />
      </Dialog.Content>

      <Dialog.Actions>
        <Button onPress={hideModal}>Cancel</Button>
        <Button onPress={handleCreateMap}>Create Map</Button>
      </Dialog.Actions>
    </Dialog>
  );
}
