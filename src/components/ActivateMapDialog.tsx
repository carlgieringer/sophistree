import { Button, Dialog, Portal } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";

import { setActiveMap } from "../store/entitiesSlice";
import * as selectors from "../store/selectors";

export default function ActiveMapDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const dispatch = useDispatch();

  const maps = useSelector(selectors.allMaps);

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
  }

  const buttons = maps.map((m) => (
    <Button
      key={m.id}
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
