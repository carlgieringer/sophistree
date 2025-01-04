import React from "react";
import { Button, Dialog } from "react-native-paper";
import { useDispatch } from "react-redux";
import { ScrollView, StyleSheet } from "react-native";

import { setActiveMap, useActiveMapId } from "../store/entitiesSlice";
import ArgumentMapView from "./ArgumentMapView";
import { useAllMaps } from "../sync/hooks";
import { DocumentId } from "@automerge/automerge-repo";

export default function ActiveMapDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const dispatch = useDispatch();

  const activeMapId = useActiveMapId();
  const maps = useAllMaps();

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
                dispatch(setActiveMap(map.id as DocumentId));
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
    <Dialog visible={visible} onDismiss={hideModal} style={styles.dialog}>
      <Dialog.ScrollArea>
        <ScrollView>
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

const styles = StyleSheet.create({
  dialog: {
    // Otherwise the dialog is not scrollable, and for lots of maps it renders
    // offscreen.
    maxHeight: "100%",
  },
});
