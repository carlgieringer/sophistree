import React from "react";
import { StyleSheet } from "react-native";
import { Text, Tooltip } from "react-native-paper";

interface HistoryEntryAuthorProps {
  actorId: string;
  userDisplayName?: string;
}

export function HistoryEntryAuthor({
  actorId,
  userDisplayName,
}: HistoryEntryAuthorProps) {
  return (
    <Tooltip title={`Actor ID: ${actorId}`}>
      <Text style={styles.author}>{userDisplayName || actorId}</Text>
    </Tooltip>
  );
}

const styles = StyleSheet.create({
  author: {
    fontWeight: "500",
  },
});
