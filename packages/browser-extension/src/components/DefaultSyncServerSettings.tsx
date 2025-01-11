import React, { useState, useEffect } from "react";
import { View } from "react-native";
import {
  Card,
  TextInput,
  Button,
  HelperText,
  IconButton,
  ActivityIndicator,
} from "react-native-paper";

import {
  useDefaultSyncServerAddresses,
  isValidWebsocketUrl,
} from "../sync/defaultSyncServerAddresses";
import * as appLogger from "../logging/appLogging";

export function DefaultSyncServerSettings() {
  const {
    addresses: syncServerAddresses,
    loading,
    error,
    save,
  } = useDefaultSyncServerAddresses();
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [validationErrors, setValidationErrors] = useState<
    (string | undefined)[]
  >([]);

  useEffect(() => {
    // Initialize with at least one empty input if no addresses exist
    if (!loading) {
      setAddresses(syncServerAddresses.length ? syncServerAddresses : [""]);
    }
  }, [syncServerAddresses, loading]);

  const handleAddressChange = (index: number, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);

    // Validate and update errors
    const { isValid, message } = isValidWebsocketUrl(value);
    const newErrors = [...validationErrors];
    newErrors[index] = isValid ? undefined : message;
    setValidationErrors(newErrors);
  };

  const handleAddAddress = () => {
    setAddresses([...addresses, ""]);
    setValidationErrors([...validationErrors, undefined]);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    const newErrors = validationErrors.filter((_, i) => i !== index);
    setAddresses(newAddresses.length ? newAddresses : [""]); // Keep at least one input
    setValidationErrors(newErrors.length ? newErrors : [undefined]);
  };

  const handleSave = () => {
    // Filter out empty addresses
    const nonEmptyAddresses = addresses.filter((addr) => addr.trim());

    // Validate all addresses
    const allValid = nonEmptyAddresses.every(
      (addr) => isValidWebsocketUrl(addr).isValid,
    );

    if (allValid) {
      save(nonEmptyAddresses).catch((reason) =>
        appLogger.error(`Failed to save syncServerAddresses: ${reason}`),
      );
    }
  };

  if (loading) {
    return (
      <Card style={{ marginTop: 16 }}>
        <Card.Title title="Sync Server Configuration" />
        <Card.Content style={{ alignItems: "center", padding: 16 }}>
          <ActivityIndicator />
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={{ marginTop: 16 }}>
      <Card.Title
        title="Sync Server Configuration"
        subtitle={error ? error.message : undefined}
        subtitleStyle={{ color: "red" }}
      />
      <Card.Content>
        {addresses.map((address, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1 }}>
              <TextInput
                mode="outlined"
                value={address}
                onChangeText={(value) => handleAddressChange(index, value)}
                placeholder=" wss://sophistree.app or ws://localhost:3000"
                error={!!validationErrors[index]}
              />
              <HelperText type="error" visible={!!validationErrors[index]}>
                {validationErrors[index]}
              </HelperText>
            </View>
            <IconButton
              icon="close"
              mode="contained-tonal"
              onPress={() => handleRemoveAddress(index)}
              style={{ marginLeft: 8 }}
            />
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Button mode="contained-tonal" onPress={handleAddAddress} icon="plus">
            Add Server
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            disabled={validationErrors.some((error) => error !== undefined)}
          >
            Save
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}
