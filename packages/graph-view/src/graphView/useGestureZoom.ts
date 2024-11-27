import { MutableRefObject, useEffect } from "react";
import cytoscape from "cytoscape";
import { useGesture } from "@use-gesture/react";
import { GraphViewLogger } from "./graphTypes";

const zoomFactor = 0.03;
const zoomInFactor = 1 + zoomFactor;
const zoomOutFactor = 1 - zoomFactor;
const pinchZoomDampeningFactor = 0.15;

// Extend cytoscape Core type to include our custom property
interface ExtendedCore extends cytoscape.Core {
  _initialZoom?: number;
}

export function useGestureZoom(
  cyRef: MutableRefObject<cytoscape.Core | undefined>,
  logger: GraphViewLogger,
) {
  const zoom = ({
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
  };

  const zoomByFactor = (
    factor: number,
    renderedPosition: { x: number; y: number },
  ) => {
    const cy = cyRef.current;
    if (!cy) {
      logger.warn("Cannot zoom because there is no cy ref.");
      return;
    }
    const level = cy.zoom() * factor;
    zoom({ level, renderedPosition });
  };

  const zoomIn = (event: { position?: { x: number; y: number } }) => {
    logger.info("Zoom in called");
    zoomByFactor(zoomInFactor ** 5, {
      x: event.position?.x ?? 0,
      y: event.position?.y ?? 0,
    });
  };

  const zoomOut = (event: { position?: { x: number; y: number } }) => {
    logger.info("Zoom out called");
    zoomByFactor(zoomOutFactor ** 5, {
      x: event.position?.x ?? 0,
      y: event.position?.y ?? 0,
    });
  };

  const bind = useGesture(
    {
      onWheel: ({
        event,
        ctrlKey,
        metaKey,
        delta: [deltaX, deltaY],
        offset: [x, y],
      }) => {
        logger.info("Wheel event", { deltaX, deltaY, ctrlKey, metaKey });
        event.preventDefault();
        if (!cyRef.current) return;

        const cy = cyRef.current;
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        const renderedPosition = {
          x: x - rect.left,
          y: y - rect.top,
        };

        if (ctrlKey || metaKey) {
          // Pinch zoom
          const factor = deltaY > 0 ? zoomOutFactor : zoomInFactor;
          zoomByFactor(factor, renderedPosition);
        } else {
          // Pan - allow diagonal movement by passing both deltaX and deltaY in a single panBy call
          cy.panBy({ x: -deltaX, y: -deltaY });
        }
      },
      onPinch: ({
        event,
        origin: [ox, oy],
        offset: [scale],
        first,
        active,
      }) => {
        logger.info("Pinch event", { scale, first, active });
        event.preventDefault();
        if (!cyRef.current || !active) return;

        const cy = cyRef.current as ExtendedCore;
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();

        if (first) {
          // Store the initial zoom level when the pinch starts
          cy._initialZoom = cy.zoom();
        }

        // Apply dampening to the scale value
        const dampenedScale = 1 + (scale - 1) * pinchZoomDampeningFactor;
        const newLevel = (cy._initialZoom || cy.zoom()) * dampenedScale;

        zoom({
          level: newLevel,
          renderedPosition: {
            x: ox - rect.left,
            y: oy - rect.top,
          },
        });
      },
    },
    {
      eventOptions: { passive: false },
    },
  );

  useEffect(() => {
    const container = cyRef.current?.container();
    if (container) {
      logger.info("Binding gesture handlers to container");

      // Add event listeners manually
      const handlers = bind();
      const onWheel = handlers.onWheel as unknown as WheelHandler;
      const onTouchStart = handlers.onTouchStart as unknown as TouchHandler;
      const onTouchMove = handlers.onTouchMove as unknown as TouchHandler;
      const onTouchEnd = handlers.onTouchEnd as unknown as TouchHandler;
      container.addEventListener("wheel", onWheel);
      container.addEventListener("touchstart", onTouchStart);
      container.addEventListener("touchmove", onTouchMove);
      container.addEventListener("touchend", onTouchEnd);

      return () => {
        logger.info("Cleaning up gesture handlers");
        container.removeEventListener("wheel", onWheel);
        container.removeEventListener("touchstart", onTouchStart);
        container.removeEventListener("touchmove", onTouchMove);
        container.removeEventListener("touchend", onTouchEnd);
      };
    }
  }, [bind, cyRef, logger]);

  return {
    zoomIn,
    zoomOut,
  };
}

interface WheelHandler {
  (this: HTMLElement, ev: WheelEvent): unknown;
}

interface TouchHandler {
  (this: HTMLElement, ev: TouchEvent): unknown;
}
