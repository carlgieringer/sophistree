import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, Dialog, Button, IconButton, Portal } from "react-native-paper";

interface HistoryEntryAuthorProps {
  actorId: string;
  userDisplayName?: string;
}

export function HistoryEntryAuthor({
  actorId,
  userDisplayName,
}: HistoryEntryAuthorProps) {
  const [dialogVisible, setDialogVisible] = useState(false);

  const showDialog = () => setDialogVisible(true);
  const hideDialog = () => setDialogVisible(false);

  return (
    <>
      <View style={styles.container}>
        <IconButton
          icon="information"
          size={16}
          onPress={showDialog}
          style={styles.infoButton}
        />
        <Text>{userDisplayName || actorId}</Text>
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>Author Details</Dialog.Title>
          <Dialog.Content>
            <Text>Actor ID: {actorId}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoButton: {
    margin: 0,
  },
});
