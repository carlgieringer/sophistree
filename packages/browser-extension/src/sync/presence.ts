import { Position } from "cytoscape";
import {
  DocHandle,
  DocHandleEphemeralMessagePayload,
} from "@automerge/automerge-repo";
import { getActorId } from "@automerge/automerge/next";
import { ArgumentMap } from "@sophistree/common";
import { useCallback, useEffect, useState } from "react";

import {
  PRESENCE_BROADCAST_INTERVAL_MS,
  CollaborativePresenceState,
  UserPresence,
} from "@sophistree/ui-common";

import * as appLogger from "../logging/appLogging";

interface PresenceUpdateMessage extends UserPresence {
  type: "presence-update";
}

type EphemeralMessage = PresenceUpdateMessage;

export function broadcastPresence(handle: DocHandle<ArgumentMap>) {
  const doc = handle.docSync();
  if (!doc) {
    appLogger.warn("Cannot broadcast presence: doc is undefined");
    return;
  }
  const actorId = getActorId(doc);
  handle.broadcast({
    type: "presence-update",
    actorId,
    presenceTimestampEpochMs: Date.now(),
  });
}

export function broadcastCursorPosition(
  handle: DocHandle<ArgumentMap>,
  position: Position,
) {
  const doc = handle.docSync();
  if (!doc) {
    appLogger.warn("Cannot broadcast cursor position: doc is undefined");
    return;
  }
  const actorId = getActorId(doc);
  handle.broadcast({
    type: "presence-update",
    actorId,
    cursorPosition: position,
    presenceTimestampEpochMs: Date.now(),
  });
}

export function broadcastSelection(
  handle: DocHandle<ArgumentMap>,
  selection: string[],
) {
  const doc = handle.docSync();
  if (!doc) {
    appLogger.warn("Cannot broadcast selection: doc is undefined");
    return;
  }
  const actorId = getActorId(doc);
  handle.broadcast({
    type: "presence-update",
    actorId,
    selection,
    presenceTimestampEpochMs: Date.now(),
  });
}

export function startPresenceBroadcasting(handle: DocHandle<ArgumentMap>) {
  broadcastPresence(handle);

  const intervalId = setInterval(() => {
    broadcastPresence(handle);
  }, PRESENCE_BROADCAST_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
  };
}

export function useCollaborativePresence(
  handle: DocHandle<ArgumentMap> | undefined,
) {
  const [presenceState, setPresenceState] =
    useState<CollaborativePresenceState>({
      presenceByActorId: {},
    });

  useEffect(() => {
    if (!handle) {
      return;
    }

    const onEphemeralMessage = (
      payload: DocHandleEphemeralMessagePayload<ArgumentMap>,
    ) => {
      const message = payload.message as EphemeralMessage;

      switch (message.type) {
        case "presence-update": {
          setPresenceState((prev) => {
            const actorId = message.actorId;
            const userDisplayName =
              handle.docSync()?.userInfoByActorId[actorId]?.userDisplayName;
            return {
              presenceByActorId: {
                ...prev.presenceByActorId,
                [actorId]: {
                  ...prev.presenceByActorId[actorId],
                  ...message,
                  userDisplayName,
                },
              },
            };
          });
          break;
        }
        default:
          appLogger.warn(
            `Unrecognized ephemeral message type: ${(message as { type?: string }).type}`,
            message,
          );
      }
    };

    const cleanup = startPresenceBroadcasting(handle);

    handle.on("ephemeral-message", onEphemeralMessage);

    return () => {
      cleanup();
      handle.off("ephemeral-message", onEphemeralMessage);
    };
  }, [handle]);

  const broadcastCursorPositionCallback = useCallback(
    (position: Position) => {
      if (handle) {
        broadcastCursorPosition(handle, position);
      }
    },
    [handle],
  );

  const broadcastSelectionCallback = useCallback(
    (selection: string[]) => {
      if (handle) {
        broadcastSelection(handle, selection);
      }
    },
    [handle],
  );

  return {
    presenceState,
    broadcastCursorPosition: broadcastCursorPositionCallback,
    broadcastSelection: broadcastSelectionCallback,
  };
}
