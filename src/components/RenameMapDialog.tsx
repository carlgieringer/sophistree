import React, { useEffect, useState } from "react";
import { Dialog, TextInput, Button } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import * as selectors from "../store/selectors";
import { renameActiveMap } from "../store/entitiesSlice";
import { use } from "cytoscape";

interface RenameMapDialogProps {
  visible: boolean;
  onDismiss: () => void;
}

const RenameMapDialog: React.FC<RenameMapDialogProps> = ({
  visible,
  onDismiss,
}) => {
  const dispatch = useDispatch();
  const activeMapName = useSelector(selectors.activeMapName);
  if (activeMapName === undefined) {
    throw new Error("Active map name is undefined");
  }
  const [newName, setNewName] = useState(activeMapName);

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
