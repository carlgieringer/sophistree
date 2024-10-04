import { MediaExcerpt } from "../store/entitiesSlice";

export interface CreateMediaExcerptMessage {
  action: "createMediaExcerpt";
  selectedText: string;
}
export interface ActivateMediaExcerptMessage {
  action: "activateMediaExcerpt";
  mediaExcerpt: MediaExcerpt;
}

export interface RequestUrlMessage {
  action: "requestUrl";
}

export type ContentMessage =
  | CreateMediaExcerptMessage
  | ActivateMediaExcerptMessage
  | RequestUrlMessage;

export function getTabUrl(tabId: number): Promise<string> {
  const message: RequestUrlMessage = {
    action: "requestUrl",
  };
  return chrome.tabs.sendMessage(tabId, message);
}
