"use client";

import React, { useState, useCallback, useMemo, CSSProperties } from "react";
import { GraphView } from "@sophistree/graph-view";
import { determineOutcomes, Entity, MediaExcerpt } from "@sophistree/common";

const logger = {
  info: (message: string) => console.info(message),
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
  const [collapsedEntityIds, setCollapsedEntityIds] = useState<Set<string>>(
    new Set(),
  );

  const handleSelectEntities = useCallback((entityIds: string[]) => {
    setSelectedEntityIds(entityIds);
  }, []);

  const handleResetSelection = useCallback(() => {
    setSelectedEntityIds([]);
  }, []);

  const handleFocusMediaExcerpt = useCallback((mediaExcerpt: MediaExcerpt) => {
    window.open(mediaExcerpt.urlInfo.url, "_blank");
  }, []);

  const handleToggleCollapse = useCallback((entityId: string) => {
    setCollapsedEntityIds((prev) => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
      }
      return next;
    });
  }, []);

  const outcomes = useMemo(() => determineOutcomes(entities), [entities]);

  const entitiesWithCollapse = useMemo(
    () =>
      entities.map((entity) => ({
        ...entity,
        isCollapsed: collapsedEntityIds.has(entity.id),
      })),
    [entities, collapsedEntityIds],
  );

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <GraphView
        id={id}
        style={style}
        entities={entitiesWithCollapse}
        selectedEntityIds={selectedEntityIds}
        outcomes={outcomes}
        logger={logger}
        onSelectEntities={handleSelectEntities}
        onResetSelection={handleResetSelection}
        onFocusMediaExcerpt={handleFocusMediaExcerpt}
        onToggleCollapse={handleToggleCollapse}
      />
    </div>
  );
}
