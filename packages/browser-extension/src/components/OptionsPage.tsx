import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useRefreshAuth } from "../store/hooks";
import { AuthenticationCard } from "./AuthenticationCard";
import { ApiEndpointOverrideSetting } from "./ApiEndpointOverrideSetting";
import { SyncServerSettings } from "./SyncServerSettings";

export function OptionsPage() {
  useRefreshAuth();

  return (
    <View style={{ maxWidth: 800, marginHorizontal: 'auto', padding: 32 }}>
      <Text variant="headlineLarge" style={{ textAlign: "center", marginBottom: 32 }}>
        Sophistree Options
      </Text>
      <AuthenticationCard />
      <ApiEndpointOverrideSetting />
      <SyncServerSettings />
    </View>
  );
}
