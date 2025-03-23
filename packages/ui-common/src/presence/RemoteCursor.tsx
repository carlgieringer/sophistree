import { MutableRefObject } from "react";
import cytoscape from "cytoscape";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { DISPLAY_NAME_FADE_DURATION_MS } from "./types";
import "./RemoteCursor.scss";

import { UserPresence } from "./types";
import { modelToRenderedPosition } from "./coordinateUtils";
import { useDisplayNameVisibility } from "./displayNameUtils";

interface RemoteCursorProps {
  presence: UserPresence;
  cyRef: MutableRefObject<cytoscape.Core | undefined>;
}

const iconSize = 20;
// The icon is pointing a bit down from the top and away from the left edge.
const materialCommunityIconsCursorXOffset = 4;
const materialCommunityIconsCursorYOffset = 8;

export default function RemoteCursor({ presence, cyRef }: RemoteCursorProps) {
  const isActive = Date.now() - presence.presenceTimestampEpochMs < 5000;
  const { isDisplayNameVisible, setIsHovered } = useDisplayNameVisibility(
    presence.presenceTimestampEpochMs,
  );

  if (!isActive || !presence.cursorPosition) return null;

  // Calculate the rendered position using utility function
  const renderedPosition = modelToRenderedPosition(
    presence.cursorPosition,
    cyRef,
    {
      offsetX: iconSize / 2 - materialCommunityIconsCursorXOffset,
      offsetY: iconSize / 2 - materialCommunityIconsCursorYOffset,
    },
  );

  return (
    <div
      className="remote-cursor"
      style={{
        left: renderedPosition.x,
        top: renderedPosition.y,
        transform: "translate(-50%, -50%)",
        position: "absolute",
        zIndex: 1000,
        pointerEvents: "none", // Allow clicking through the cursor
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Triangle cursor icon */}
      <div className="cursor-icon">
        <Icon name="cursor-default-outline" size={iconSize} color="#FF5722" />
      </div>

      {/* Display name with animation */}
      {isDisplayNameVisible && (
        <div
          className={`display-name ${isDisplayNameVisible ? "visible" : "fading"}`}
          style={{
            position: "absolute",
            left: "100%",
            marginLeft: "8px",
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            fontSize: "12px",
            whiteSpace: "nowrap",
            pointerEvents: "auto", // Allow hovering on the display name
            transition: `opacity ${DISPLAY_NAME_FADE_DURATION_MS}ms ease-out`,
          }}
        >
          {presence.userDisplayName || "Unknown User"}
        </div>
      )}
    </div>
  );
}
