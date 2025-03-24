import React, { useEffect, useState } from "react";
import { DISPLAY_NAME_FADE_DURATION_MS } from "./types";
import { getEntityId } from "../graphView/entityIds";
import { modelToRenderedPosition } from "./coordinateUtils";
import { useDisplayNameVisibility } from "./displayNameUtils";

import "./RemoteSelection.scss";

interface RemoteSelectionProps {
  selection: string[] | undefined;
  displayName: string;
  cyRef: React.MutableRefObject<cytoscape.Core | undefined>;
}

export default function RemoteSelection({
  selection,
  displayName,
  cyRef,
}: RemoteSelectionProps) {
  // Use timestamp to trigger display name visibility when selection changes
  const [selectionTimestamp, setSelectionTimestamp] = useState<number>();

  useEffect(() => {
    setSelectionTimestamp(Date.now());
  }, [selection]); // Update timestamp when selection changes

  const { isDisplayNameVisible, setIsHovered } =
    useDisplayNameVisibility(selectionTimestamp);

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
    selectedNodes.on("mouseover", () => setIsHovered(true));
    selectedNodes.on("mouseout", () => setIsHovered(false));

    // Clean up
    return () => {
      selectedNodes.removeClass("remotely-selected");
      selectedNodes.off("mouseover mouseout");
    };
  }, [cyRef, selection, setIsHovered]);

  // If there's no selection, don't render anything
  if (!selection?.length) return null;

  // Get the rendered position for the display name
  const getDisplayNamePosition = () => {
    if (!cyRef.current || !selection?.length) return { x: 0, y: 0 };

    const cy = cyRef.current;
    const selectedNodes = cy
      .nodes()
      .filter((node) => selection.includes(getEntityId(node)));
    const bb = selectedNodes.boundingBox();

    // Convert center point of bounding box to rendered coordinates
    return modelToRenderedPosition(
      { x: (bb.x1 + bb.x2) / 2, y: bb.y1 - 20 }, // Position above the selection
      cyRef,
    );
  };

  const renderedPosition = getDisplayNamePosition();
  return isDisplayNameVisible ? (
    <div
      className="remote-selection-name"
      style={{
        position: "absolute",
        left: renderedPosition.x,
        top: renderedPosition.y,
        transform: "translate(-50%, -100%)",
        transition: `opacity ${DISPLAY_NAME_FADE_DURATION_MS}ms ease-out`,
      }}
    >
      {displayName}
    </div>
  ) : null;
}
