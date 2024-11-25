"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Entity } from "@sophistree/common";
import { useEffect } from "react";
import WebGraphView from "./WebGraphView";

const logger = {
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
};

export default function ArgumentMapPage() {
  const params = useParams();
  const id = params.id as string;

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
        setEntities(data.entities);
      } catch (error) {
        logger.error(`Failed to fetch map data: ${error}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMapData();
  }, [id]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <WebGraphView
        id={id}
        style={{ width: "100%", height: "100%" }}
        entities={entities}
      />
    </div>
  );
}
