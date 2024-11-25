"use client";

import React, { useState, useCallback, useMemo, CSSProperties } from "react";
import { GraphView } from "@sophistree/graph-view";
import { determineOutcomes, Entity, MediaExcerpt } from "@sophistree/common";

const logger = {
  warn: (message: string) => console.warn(message),
  error: (message: string) => console.error(message),
};

export default function WebGraphView({
  id,
  style,
  entities,
}: {
  id: string;
  style: CSSProperties;
  entities: Entity[];
}) {
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  const handleSelectEntities = useCallback((entityIds: string[]) => {
    setSelectedEntityIds(entityIds);
  }, []);

  const handleResetSelection = useCallback(() => {
    setSelectedEntityIds([]);
  }, []);

  const handleFocusMediaExcerpt = useCallback((mediaExcerpt: MediaExcerpt) => {
    window.open(mediaExcerpt.urlInfo.url, "_blank");
  }, []);

  const outcomes = useMemo(() => determineOutcomes(entities), [entities]);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <GraphView
        id={id}
        style={style}
        entities={entities}
        selectedEntityIds={selectedEntityIds}
        outcomes={outcomes}
        logger={logger}
        onSelectEntities={handleSelectEntities}
        onResetSelection={handleResetSelection}
        onFocusMediaExcerpt={handleFocusMediaExcerpt}
      />
    </div>
  );
}
