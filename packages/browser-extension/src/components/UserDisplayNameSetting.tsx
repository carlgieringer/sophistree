import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Button, Text, TextInput, HelperText, Card } from "react-native-paper";
import {
  getUserDisplayName,
  updateUserDisplayName,
  USER_DISPLAY_LENGTH_MAX_LENGTH,
} from "../userDisplayName";

export function UserDisplayNameSetting() {
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [editedName, setEditedName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // Load the current display name
    void (async () => {
      const name = await getUserDisplayName();
      setDisplayName(name);
      if (name) {
        setEditedName(name);
      }
    })();
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(displayName || "");
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      await updateUserDisplayName(editedName);
      setDisplayName(editedName);
      setIsEditing(false);
    } catch (_error) {
      setError(`Failed to update display name.`);
    } finally {
      setIsLoading(false);
    }
  };

  const isNameTooLong = editedName.length > 64;

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text variant="titleLarge">Display Name</Text>
        <Text variant="bodyMedium" style={styles.description}>
          This name will be shown to others when you make changes to maps.
        </Text>

        {isEditing ? (
          <>
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              style={styles.input}
              error={isNameTooLong}
              disabled={isLoading}
              maxLength={USER_DISPLAY_LENGTH_MAX_LENGTH}
            />
            {isNameTooLong && (
              <HelperText type="error">
                Display name must be less than 64 characters
              </HelperText>
            )}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={styles.button}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => void handleSave()}
                disabled={!editedName || isLoading || isNameTooLong}
                style={styles.button}
              >
                Save
              </Button>
            </View>
          </>
        ) : (
          <>
            <Text variant="bodyLarge" style={styles.displayName}>
              {displayName || "Loading..."}
            </Text>
            <Button mode="outlined" onPress={handleEdit}>
              Edit
            </Button>
          </>
        )}

        {error && <HelperText type="error">{error}</HelperText>}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  description: {
    marginVertical: 8,
  },
  displayName: {
    marginVertical: 16,
    fontWeight: "bold",
  },
  input: {
    marginVertical: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  button: {
    marginLeft: 8,
  },
});
