import { Button, Dialog, Portal } from "react-native-paper";
import { useDispatch, useSelector } from "react-redux";
import { ScrollView } from "react-native";

import { setActiveMap } from "../store/entitiesSlice";
import * as selectors from "../store/selectors";
import ArgumentMapView from "./ArgumentMapView";

export default function ActiveMapDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const dispatch = useDispatch();

  const activeMapId = useSelector(selectors.activeMapId);
  const maps = useSelector(selectors.allMaps);

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
  }

  const mapCards = maps.map((map) => {
    const isActive = map.id === activeMapId;
    return (
      <ArgumentMapView
        key={map.id}
        map={map}
        isActive={isActive}
        titleButton={
          !isActive && (
            <Button
              onPress={() => {
                dispatch(setActiveMap(map.id));
                hideModal();
              }}
            >
              Open
            </Button>
          )
        }
      />
    );
  });

  return (
    <Dialog visible={visible} onDismiss={hideModal}>
      <Dialog.ScrollArea>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
          <Dialog.Title>Open a map</Dialog.Title>
          <Dialog.Content>{mapCards}</Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideModal}>Cancel</Button>
          </Dialog.Actions>
        </ScrollView>
      </Dialog.ScrollArea>
    </Dialog>
  );
}
