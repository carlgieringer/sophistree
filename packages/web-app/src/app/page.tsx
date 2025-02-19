"use client";

import React, { useEffect } from "react";
import { View } from "react-native";
import {
  Text,
  Surface,
  List,
  ActivityIndicator,
  useTheme,
  Button,
} from "react-native-paper";
import { Provider } from "react-redux";
import { useRouter } from "next/navigation";

import { ArgumentMapCard } from "@sophistree/ui-common";

import { store } from "../store/store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchArgumentMaps } from "../store/argumentMapsSlice";

// Wrap the main content in a separate component to use Redux hooks
function HomeContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    items: argumentMaps,
    isLoading,
    error,
  } = useAppSelector((state) => state.argumentMaps);

  useEffect(() => {
    dispatch(fetchArgumentMaps());
  }, [dispatch]);

  const handleMapClick = (mapId: string) => {
    router.push(`/argument-maps/${mapId}`);
  };

  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        height: "100%",
        backgroundColor: theme.colors.backdrop,
      }}
    >
      <Surface
        style={{ margin: 20, padding: 20, elevation: 1, borderRadius: 4 }}
      >
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
              {argumentMaps.map((map) => {
                const displayName =
                  map.createdBy.name || map.createdBy.pseudonym;
                return (
                  <ArgumentMapCard
                    key={map.id}
                    map={map}
                    titleButton={
                      <Button onPress={() => handleMapClick(map.id)}>
                        Open
                      </Button>
                    }
                    createdAt={map.createdAt}
                    updatedAt={map.updatedAt}
                    userInfo={
                      map.createdBy
                        ? {
                            id: map.createdBy.id,
                            displayName,
                          }
                        : undefined
                    }
                  />
                );
              })}
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
