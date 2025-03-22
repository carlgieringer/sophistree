import { useState, useEffect } from "react";
import { DISPLAY_NAME_SHOW_TIMEOUT_MS } from "./types";

/**
 * Custom hook to manage display name visibility with timeouts
 */
export function useDisplayNameVisibility(
  triggerTimestamp?: number
): {
  isDisplayNameVisible: boolean;
  setIsHovered: (value: boolean) => void;
} {
  const [isDisplayNameVisible, setIsDisplayNameVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Show display name when trigger changes or on hover
  useEffect(() => {
    if (triggerTimestamp || isHovered) {
      setIsDisplayNameVisible(true);

      // Start timeout to hide display name
      const timeout = setTimeout(() => {
        if (!isHovered) {
          setIsDisplayNameVisible(false);
        }
      }, DISPLAY_NAME_SHOW_TIMEOUT_MS);

      return () => clearTimeout(timeout);
    }
  }, [triggerTimestamp, isHovered]);

  return { isDisplayNameVisible, setIsHovered };
}
