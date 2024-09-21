import { Button, Dialog, Portal } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../store";
import { setActiveMap } from "../store/entitiesSlice";

export default function ActiveMapSelector({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const dispatch = useDispatch();

  const maps = useSelector((state: RootState) => state.entities.maps);

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
  }

  const buttons = maps.map((m) => (
    <Button
      onPress={() => {
        dispatch(setActiveMap(m.id));
        hideModal();
      }}
    >
      Open {m.name}
    </Button>
  ));

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={hideModal}>
        <Dialog.Title>Open a map</Dialog.Title>
        <Dialog.Content>{buttons}</Dialog.Content>
        <Dialog.Actions>
          <Button onPress={hideModal}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
