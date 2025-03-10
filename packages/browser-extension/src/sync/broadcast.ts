import { DocumentId } from "@automerge/automerge-repo";
import { deleteDoc } from "./sync";
import { useEffect } from "react";
import { useAppDispatch } from "../store";
import {
  observeMapActivation,
  observeMapDeletion,
} from "../store/entitiesSlice";

// BroadcastChannelNetworkAdapter keeps side panels in different windows in
// sync, but they don't know when one of them deletes. In fact they sync
// back deleted documents to the panel that deleted them after a reload.
// So use a separate BroadcastChannel to broadcast deletes to ensure that
// all copies are deleted.
//
// This channel can also notify other instances of UI changes, like activating the map.
const broadcastChannel = new BroadcastChannel("sophistree-broadcast");

export function broadcastDocDeletion(id: DocumentId) {
  broadcastChannel.postMessage({
    type: "delete-document",
    id,
  } as DeleteDocumentMessage);
}

export function broadcastMapActivation(id: DocumentId | undefined) {
  broadcastChannel.postMessage({
    type: "activate-map",
    id,
  } as ActivateMapMessage);
}

export function useBroadcastListener() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const listener = ({ data }: MessageEvent<BroadcastMessage>) => {
      switch (data.type) {
        case "delete-document":
          deleteDoc(data.id);
          dispatch(observeMapDeletion(data.id));
          break;
        case "activate-map":
          dispatch(observeMapActivation(data.id));
          break;
      }
    };
    broadcastChannel.addEventListener("message", listener);
    return () => {
      broadcastChannel.removeEventListener("message", listener);
    };
  });
}

interface DeleteDocumentMessage {
  type: "delete-document";
  id: DocumentId;
}
interface ActivateMapMessage {
  type: "activate-map";
  id: DocumentId | undefined;
}
type BroadcastMessage = DeleteDocumentMessage | ActivateMapMessage;
