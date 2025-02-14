import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  Dialog,
  TextInput,
} from "react-native-paper";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DocumentId, isValidDocumentId } from "@automerge/automerge-repo";

import { ArgumentMapCard } from "@sophistree/ui-common";

import {
  openSyncedMap,
  setActiveMap,
  useActiveMapAutomergeDocumentId,
  useIsOpeningSyncedMap,
} from "../store/entitiesSlice";
import { useAllMaps } from "../sync/hooks";
import { useAppDispatch } from "../store";
import { useDefaultSyncServerAddresses } from "../sync/defaultSyncServerAddresses";
import * as appLogger from "../logging/appLogging";

export default function ActiveMapDialog({
  onDismiss,
  visible,
}: {
  onDismiss?: () => void;
  visible: boolean;
}) {
  const dispatch = useAppDispatch();

  const activeMapId = useActiveMapAutomergeDocumentId();
  const maps = useAllMaps();

  function hideModal() {
    if (onDismiss) {
      onDismiss();
    }
  }

  const mapCards = maps.map((map) => {
    const isActive = map.automergeDocumentId === activeMapId;
    return (
      <ArgumentMapCard
        key={map.id}
        map={map}
        isActive={isActive}
        titleButton={
          !isActive && (
            <Button
              onPress={() => {
                dispatch(setActiveMap(map.automergeDocumentId as DocumentId));
                hideModal();
              }}
            >
              Open
            </Button>
          )
        }
        logger={appLogger}
      />
    );
  });

  const [documentId, setDocumentId] = useState("");
  const [documentIdError, setDocumentIdError] = useState("");
  const { addresses: syncServerAddresses } = useDefaultSyncServerAddresses();
  function openDocumentId() {
    if (!documentId || !isValidDocumentId(documentId)) {
      return;
    }
    dispatch(openSyncedMap({ documentId, syncServerAddresses }))
      .unwrap()
      .then(
        () => {
          hideModal();
        },
        (errorMessage: string) => {
          setDocumentIdError(errorMessage);
        },
      );
  }
  const isOpeningSyncedMap = useIsOpeningSyncedMap();
  function onDocumentIdTextChanged(text: string) {
    setDocumentId(text);
    setDocumentIdError("");
  }

  return (
    <Dialog visible={visible} onDismiss={hideModal} style={styles.dialog}>
      <Dialog.ScrollArea>
        <ScrollView>
          <Dialog.Title>Open a map</Dialog.Title>
          <Dialog.Content>
            <View style={styles.inputContainer}>
              <TextInput
                label="Sync Document ID"
                value={documentId}
                onSubmitEditing={openDocumentId}
                onChangeText={onDocumentIdTextChanged}
                style={styles.input}
              />
              <View style={styles.buttonContainer}>
                <Button
                  disabled={
                    !documentId ||
                    !isValidDocumentId(documentId) ||
                    isOpeningSyncedMap
                  }
                  onPress={openDocumentId}
                  style={styles.button}
                >
                  Open
                </Button>
                {isOpeningSyncedMap && (
                  <ActivityIndicator size={20} style={styles.spinner} />
                )}
              </View>
            </View>
            {documentIdError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{documentIdError}</Text>
              </View>
            ) : null}
            {mapCards}
          </Dialog.Content>
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    alignSelf: "center",
  },
  spinner: {
    marginLeft: 4,
  },
  errorContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    color: "#B00020",
  },
});
