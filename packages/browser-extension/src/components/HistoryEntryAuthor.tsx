import React, { useState, useCallback, useEffect } from "react";
import { StyleSheet, Pressable } from "react-native";
import { Text, Dialog, Button, IconButton, Portal } from "react-native-paper";

interface HistoryEntryAuthorProps {
  deviceId: string;
  userDisplayName?: string;
}

export function HistoryEntryAuthor({
  deviceId,
  userDisplayName,
}: HistoryEntryAuthorProps) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [fadeTimeout, setFadeTimeout] = useState<NodeJS.Timeout | undefined>(
    undefined,
  );

  const showDialog = () => setDialogVisible(true);
  const hideDialog = () => setDialogVisible(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      setFadeTimeout(undefined);
    }
  }, [fadeTimeout]);

  const handleMouseLeave = useCallback(() => {
    const timeout = setTimeout(() => {
      setIsHovered(false);
    }, 2000);
    setFadeTimeout(timeout);
  }, []);

  useEffect(() => {
    return () => {
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
      }
    };
  }, [fadeTimeout]);

  return (
    <>
      <Pressable
        style={styles.container}
        onHoverIn={handleMouseEnter}
        onHoverOut={handleMouseLeave}
      >
        <IconButton
          icon="information"
          size={16}
          onPress={showDialog}
          style={[styles.infoButton, { opacity: isHovered ? 1 : 0 }]}
        />
        <Text>{userDisplayName || deviceId}</Text>
      </Pressable>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>Author Details</Dialog.Title>
          <Dialog.Content>
            <Text>Device ID: {deviceId}</Text>
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
    transition: "opacity 0.3s ease",
  },
});
