import React, { useEffect, useRef, useState } from "react";
import { TextInput as RNTextInput } from "react-native";
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
  const inputRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setNewName(mapName);
    }
  }, [visible, mapName]);

  const handleRename = () => {
    dispatch(renameActiveMap(newName));
    onDismiss();
  };

  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>Rename Map</Dialog.Title>
      <Dialog.Content>
        <TextInput
          label="Map name"
          placeholder="Enter a map name"
          value={newName}
          onChangeText={(text) => setNewName(text)}
          onSubmitEditing={handleRename}
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
