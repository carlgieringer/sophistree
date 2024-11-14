"use client";

import React, { useEffect } from "react";
import { View } from "react-native";
import { Text, Surface, List, ActivityIndicator } from "react-native-paper";
import { Provider } from "react-redux";
import { store } from "../store/store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchArgumentMaps } from "../store/argumentMapsSlice";

// Wrap the main content in a separate component to use Redux hooks
function HomeContent() {
  const dispatch = useAppDispatch();
  const {
    items: argumentMaps,
    isLoading,
    error,
  } = useAppSelector((state) => state.argumentMaps);

  // const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchArgumentMaps());
  }, [dispatch]);

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Surface style={{ padding: 20, elevation: 1, borderRadius: 4 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 20 }}>
          Sophistree
        </Text>

        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text variant="titleLarge">Argument Maps</Text>
          </View>

          {error && (
            <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>
          )}

          {isLoading && <ActivityIndicator animating={true} />}
          {!isLoading && argumentMaps.length === 0 ? (
            <Text style={{ color: "black" }}>No maps.</Text>
          ) : (
            <View>
              {argumentMaps.map((map) => (
                <List.Item
                  key={map.id}
                  title={map.name}
                  description={`Last updated: ${new Date(map.updatedAt).toLocaleDateString()}`}
                  style={{ borderBottomWidth: 1, borderBottomColor: "#eee" }}
                />
              ))}
            </View>
          )}
        </View>
      </Surface>
    </View>
  );
}

// Wrap the app with Redux Provider
export default function Home() {
  return (
    <Provider store={store}>
      <HomeContent />
    </Provider>
  );
}
