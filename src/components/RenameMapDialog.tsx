import React, { useState } from "react";
import { Dialog, TextInput, Button } from "react-native-paper";
import { useDispatch } from "react-redux";

import { renameActiveMap } from "../store/entitiesSlice";

interface RenameMapDialogProps {
  visible: boolean;
  onDismiss: () => void;
  mapName: string;
}

const RenameMapDialog: React.FC<RenameMapDialogProps> = ({
  visible,
  onDismiss,
  mapName,
}) => {
  const dispatch = useDispatch();
  const [newName, setNewName] = useState(mapName);

  const handleRename = () => {
    dispatch(renameActiveMap(newName));
    onDismiss();
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Rename Map</Dialog.Title>
      <Dialog.Content>
        <TextInput
          value={newName}
          onChangeText={(text) => setNewName(text)}
          placeholder="Enter a map name"
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={handleRename}>Rename</Button>
        <Button onPress={onDismiss}>Cancel</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default RenameMapDialog;
