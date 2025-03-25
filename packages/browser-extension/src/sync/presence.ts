import { Position } from "cytoscape";
import { getDeviceId } from "../deviceId";
import {
  DocHandle,
  DocHandleEphemeralMessagePayload,
} from "@automerge/automerge-repo";
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

export async function broadcastPresence(handle: DocHandle<ArgumentMap>) {
  const doc = await handle.doc();
  if (!doc) {
    appLogger.warn("Cannot broadcast presence: doc is undefined");
    return;
  }
  const deviceId = getDeviceId(doc.automergeDocumentId);
  handle.broadcast({
    type: "presence-update",
    deviceId,
    presenceTimestampEpochMs: Date.now(),
  });
}

export async function broadcastCursorPosition(
  handle: DocHandle<ArgumentMap>,
  position: Position,
) {
  const doc = await handle.doc();
  if (!doc) {
    appLogger.warn("Cannot broadcast cursor position: doc is undefined");
    return;
  }
  const deviceId = getDeviceId(doc.automergeDocumentId);
  handle.broadcast({
    type: "presence-update",
    deviceId,
    cursorPosition: position,
    presenceTimestampEpochMs: Date.now(),
  });
}

export async function broadcastSelection(
  handle: DocHandle<ArgumentMap>,
  selection: string[],
) {
  const doc = await handle.doc();
  if (!doc) {
    appLogger.warn("Cannot broadcast selection: doc is undefined");
    return;
  }
  const deviceId = getDeviceId(doc.automergeDocumentId);
  handle.broadcast({
    type: "presence-update",
    deviceId,
    selection,
    presenceTimestampEpochMs: Date.now(),
  });
}

export function startPresenceBroadcasting(handle: DocHandle<ArgumentMap>) {
  void broadcastPresence(handle);

  const intervalId = setInterval(() => {
    void broadcastPresence(handle);
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
      presenceByDeviceId: {},
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
            const deviceId = message.deviceId;
            const userDisplayName =
              handle.docSync()?.userInfoByDeviceId[deviceId]?.userDisplayName;
            return {
              presenceByDeviceId: {
                ...prev.presenceByDeviceId,
                [deviceId]: {
                  ...prev.presenceByDeviceId[deviceId],
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
        void broadcastCursorPosition(handle, position);
      }
    },
    [handle],
  );

  const broadcastSelectionCallback = useCallback(
    (selection: string[]) => {
      if (handle) {
        void broadcastSelection(handle, selection);
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
