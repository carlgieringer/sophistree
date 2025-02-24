import React, { useEffect, useRef, useState } from "react";
import { TextInput as RNTextInput } from "react-native";
import { Dialog, TextInput, Button } from "react-native-paper";

import { renameActiveMap } from "../store/entitiesSlice";
import { useAppDispatch } from "../store";
import * as appLogger from "../logging/appLogging";

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
  const dispatch = useAppDispatch();
  const [newName, setNewName] = useState(mapName);
  const inputRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [visible]);

  const handleRename = () => {
    dispatch(renameActiveMap({ name: newName }))
      .unwrap()
      .catch((reason) =>
        appLogger.error("Failed to rename active map", reason),
      );
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
