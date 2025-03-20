import React, { useEffect } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useRefreshAuth } from "../store/hooks";
import { AuthenticationCard } from "./AuthenticationCard";
import { ApiEndpointOverrideSetting } from "./ApiEndpointOverrideSetting";
import { DefaultSyncServerSettings } from "./DefaultSyncServerSettings";
import { UserDisplayNameSetting } from "./UserDisplayNameSetting";
import { useBroadcastListener } from "../sync/broadcast";
import { useAppDispatch } from "../store";
import { loadUserDisplayName } from "../store/userDisplayNameSlice";

export function OptionsPage() {
  useRefreshAuth();
  useBroadcastListener();
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(loadUserDisplayName());
  }, [dispatch]);

  return (
    <View style={{ maxWidth: 800, marginHorizontal: "auto", padding: 32 }}>
      <Text
        variant="headlineLarge"
        style={{ textAlign: "center", marginBottom: 32 }}
      >
        Sophistree Options
      </Text>
      <AuthenticationCard />
      <UserDisplayNameSetting />
      <ApiEndpointOverrideSetting />
      <DefaultSyncServerSettings />
    </View>
  );
}
