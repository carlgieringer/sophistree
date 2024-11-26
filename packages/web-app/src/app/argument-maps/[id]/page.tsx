"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Surface, Text, Banner } from "react-native-paper";
import { View } from "react-native";

import { Entity } from "@sophistree/common";

import WebGraphView from "./WebGraphView";

const logger = {
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
};

export default function ArgumentMapPage() {
  const params = useParams();
  const id = params.id as string;

  const [mapName, setMapName] = useState<string>("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMapData() {
      try {
        const response = await fetch(`/api/argument-maps/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch map data: ${response.status}`);
        }
        const data = await response.json();
        setMapName(data.name);
        setEntities(data.entities);
      } catch (error) {
        logger.error(`Failed to fetch map data: ${error}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMapData();
  }, [id]);

  return (
    <Surface style={{ width: "100%", height: "100%" }}>
      <Text variant="titleSmall">{mapName}</Text>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <WebGraphView
          id={id}
          style={{ width: "100%", height: "100%" }}
          entities={entities}
        />
      )}
    </Surface>
  );
}
