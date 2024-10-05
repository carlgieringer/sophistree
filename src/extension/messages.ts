import { BasisOutcome } from "../outcomes/outcomes";
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

export interface UpdateMediaExcerptOutcomesMessage {
  action: "updateMediaExcerptOutcomes";
  updatedOutcomes: Map<string, BasisOutcome | undefined>;
}

export type GetMediaExcerptsMessageResponse = {
  mediaExcerpts: MediaExcerpt[];
  serializedOutcomes: [string, BasisOutcome][];
};

export type ContentMessage =
  | CreateMediaExcerptMessage
  | ActivateMediaExcerptMessage
  | RequestUrlMessage
  | UpdateMediaExcerptOutcomesMessage;

export function getTabUrl(tabId: number): Promise<string> {
  const message: RequestUrlMessage = {
    action: "requestUrl",
  };
  return chrome.tabs.sendMessage(tabId, message);
}

export function updateMediaExcerptOutcomes(
  updatedOutcomes: Map<string, BasisOutcome | undefined>,
) {
  const message: UpdateMediaExcerptOutcomesMessage = {
    action: "updateMediaExcerptOutcomes",
    updatedOutcomes,
  };

  const messagePromises: Promise<void>[] = [];
  chrome.tabs.query({ status: "complete" }, function (tabs) {
    tabs.forEach((tab) => {
      if (!tab.id) {
        console.error("Tab id is undefined");
        return;
      }
      messagePromises.push(chrome.tabs.sendMessage(tab.id, message));
    });
  });
  return Promise.all(messagePromises);
}
