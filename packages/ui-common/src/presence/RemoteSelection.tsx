import React, { useState, useEffect } from "react";

import {
  DISPLAY_NAME_SHOW_TIMEOUT_MS,
  DISPLAY_NAME_FADE_DURATION_MS,
} from "./types";
import { getEntityId } from "../graphView/entityIds";

import "./RemoteSelection.scss";

interface RemoteSelectionProps {
  actorId: string;
  selection: string[] | undefined;
  displayName: string;
  cyRef: React.MutableRefObject<cytoscape.Core | undefined>;
}

export default function RemoteSelection({
  actorId,
  selection,
  displayName,
  cyRef,
}: RemoteSelectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDisplayNameVisible, setIsDisplayNameVisible] = useState(false);

  // Apply selection highlight class to selected nodes
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    cy.nodes().removeClass("remotely-selected");
    const selectedNodes = cy
      .nodes()
      .filter((node) => selection?.includes(getEntityId(node)) ?? false);

    // Add selection class
    selectedNodes.addClass("remotely-selected");

    // Add hover handlers to show display name
    const onNodeMouseEnter = () => {
      setIsHovered(true);
      setIsDisplayNameVisible(true);
    };

    const onNodeMouseLeave = () => {
      setIsHovered(false);
      // Start timeout to hide display name
      setTimeout(() => {
        if (!isHovered) {
          setIsDisplayNameVisible(false);
        }
      }, DISPLAY_NAME_SHOW_TIMEOUT_MS);
    };

    // Add event listeners using Cytoscape's event system
    selectedNodes.on("mouseover", onNodeMouseEnter);
    selectedNodes.on("mouseout", onNodeMouseLeave);

    // Clean up
    return () => {
      selectedNodes.removeClass("remotely-selected");
      selectedNodes.off("mouseover");
      selectedNodes.off("mouseout");
    };
  }, [cyRef, selection, actorId, isHovered]);

  // Show display name when selection changes
  useEffect(() => {
    setIsDisplayNameVisible(true);
    const timeout = setTimeout(() => {
      if (!isHovered) {
        setIsDisplayNameVisible(false);
      }
    }, DISPLAY_NAME_SHOW_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [selection, isHovered]);

  // If there's no selection, don't render anything
  if (!selection?.length) return null;

  // Get the position for the display name (center of selected nodes)
  const getDisplayNamePosition = () => {
    if (!cyRef.current) return { x: 0, y: 0 };

    const cy = cyRef.current;
    const selectedNodes = cy
      .nodes()
      .filter((node) => selection?.includes(getEntityId(node)) ?? false);
    const bb = selectedNodes.renderedBoundingBox();
    return {
      x: (bb.x1 + bb.x2) / 2,
      y: bb.y1 - 20, // Position above the selection
    };
  };

  const { x, y } = getDisplayNamePosition();
  console.log({ x, y });
  return isDisplayNameVisible ? (
    <div
      className="remote-selection-name"
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        transition: `opacity ${DISPLAY_NAME_FADE_DURATION_MS}ms ease-out`,
      }}
    >
      {displayName}
    </div>
  ) : null;
}
