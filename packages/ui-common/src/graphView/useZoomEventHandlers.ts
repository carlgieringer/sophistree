import { MutableRefObject } from "react";
import cytoscape, { EventObject } from "cytoscape";
import { useCallback, useEffect, useMemo } from "react";

import { GraphViewLogger } from "./graphTypes";

const zoomFactor = 0.03;
const zoomInFactor = 1 + zoomFactor;
const zoomOutFactor = 1 - zoomFactor;
const pinchZoomInDampeningFactor = 0.015;
const pinchZoomOutDampeningFactor = 0.05;

export function useZoomEventHandlers(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  logger: GraphViewLogger,
) {
  const zoom = useCallback(
    ({
      level,
      renderedPosition,
    }: {
      level: number;
      renderedPosition: { x: number; y: number };
    }) => {
      const cy = cyRef.current;
      if (!cy) {
        logger.warn("Cannot zoom because there is no cy ref.");
        return;
      }
      cy.zoom({ level, renderedPosition });
    },
    [cyRef, logger],
  );

  const zoomByFactor = useCallback(
    (factor: number, renderedPosition: { x: number; y: number }) => {
      const cy = cyRef.current;
      if (!cy) {
        logger.warn("Cannot zoom because there is no cy ref.");
        return;
      }
      const level = cy.zoom() * factor;
      zoom({ level, renderedPosition });
    },
    [cyRef, zoom, logger],
  );

  const zoomIn = useCallback(
    (event: EventObject) => {
      zoomByFactor(zoomInFactor ** 5, {
        x: event.position?.x,
        y: event.position?.y,
      });
    },
    [zoomByFactor],
  );

  const zoomOut = useCallback(
    (event: EventObject) => {
      zoomByFactor(zoomOutFactor ** 5, {
        x: event.position?.x,
        y: event.position?.y,
      });
    },
    [zoomByFactor],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (!cyRef.current) return;

      const cy = cyRef.current;
      const deltaY = event.deltaY;
      const deltaX = event.deltaX;

      if (event.ctrlKey || event.metaKey) {
        // Pinch zoom
        const zoomFactor = deltaY > 0 ? zoomOutFactor : zoomInFactor;
        zoomByFactor(zoomFactor, { x: event.offsetX, y: event.offsetY });
      } else {
        // Pan
        cy.panBy({ x: -deltaX, y: -deltaY });
      }
    },
    [cyRef, zoomByFactor],
  );

  const touchPoints: Touch[] = useMemo(() => [], []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      touchPoints.splice(0, touchPoints.length, ...e.touches);
    },
    [touchPoints],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      if (!cyRef.current) {
        touchPoints.splice(0, touchPoints.length, ...e.touches);
        return;
      }

      if (e.touches.length === 1) {
        // Single finger pan
        const deltaX = e.touches[0].clientX - touchPoints[0].clientX;
        const deltaY = e.touches[0].clientY - touchPoints[0].clientY;
        cyRef.current.panBy({ x: deltaX, y: deltaY });
      }

      // Update touch points for next move event
      touchPoints.splice(0, touchPoints.length, ...e.touches);
    },
    [cyRef, touchPoints],
  );

  const handleTouchEnd = useCallback(() => {
    touchPoints.splice(0, touchPoints.length);
  }, [touchPoints]);

  const handleGesture = useCallback(
    (e: Event) => {
      const event = e as GestureEvent;
      if (!cyRef.current) {
        return;
      }
      if (touchPoints.length !== 2) {
        logger.info("Not a two-finger gesture");
        return;
      }
      const container = cyRef.current.container();
      if (!container) {
        logger.warn("Cannot zoom because there is no cytoscape container.");
        return;
      }
      event.preventDefault();

      // Calculate the midpoint between touch points
      const rect = container.getBoundingClientRect();
      const x =
        (touchPoints[0].clientX + touchPoints[1].clientX) / 2 - rect.left;
      const y =
        (touchPoints[0].clientY + touchPoints[1].clientY) / 2 - rect.top;

      // Apply dampening to the scale value
      const factor =
        event.scale > 1
          ? pinchZoomInDampeningFactor
          : pinchZoomOutDampeningFactor;
      const scale = 1 + (event.scale - 1) * factor;
      zoomByFactor(scale, { x, y });
    },
    [cyRef, zoomByFactor, logger, touchPoints],
  );

  useEffect(() => {
    const container = cyRef.current?.container();
    if (container) {
      container.addEventListener("wheel", handleWheel);
      container.addEventListener("gesturestart", handleGesture);
      container.addEventListener("gesturechange", handleGesture);
      container.addEventListener("gestureend", handleGesture);
      container.addEventListener("touchstart", handleTouchStart);
      container.addEventListener("touchmove", handleTouchMove);
      container.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("gesturestart", handleGesture);
        container.removeEventListener("gesturechange", handleGesture);
        container.removeEventListener("gestureend", handleGesture);
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [
    cyRef,
    handleWheel,
    handleGesture,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return { zoomIn, zoomOut };
}

type GestureEvent = Event & {
  scale: number;
  offsetX?: number;
  offsetY?: number;
  clientX: number;
  clientY: number;
};
