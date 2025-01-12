import { BasisOutcome, MediaExcerpt, UrlInfo } from "@sophistree/common";
import { AddMediaExcerptData } from "../store/entitiesSlice";
import { serializeMap } from "./serialization";
import * as appLogger from "../logging/appLogging";

export interface CreateMediaExcerptMessage {
  action: "createMediaExcerpt";
  selectedText: string;
}
export interface FocusMediaExcerptMessage {
  action: "focusMediaExcerpt";
  mediaExcerptId: string;
}

export interface RequestUrlInfoMessage {
  action: "requestUrlInfo";
}

export interface UpdateMediaExcerptOutcomesMessage {
  action: "updateMediaExcerptOutcomes";
  serializedUpdatedOutcomes: [string, BasisOutcome | undefined][];
}

export interface GetMediaExcerptsResponse {
  mediaExcerpts: MediaExcerpt[];
  serializedOutcomes: [string, BasisOutcome][];
}

export interface UpdateMediaExcerptsMessage extends MediaExcerptUpdates {
  action: "updateMediaExcerpts";
}

export interface MediaExcerptUpdates {
  add: MediaExcerpt[];
  remove: string[];
}

export interface NotifyTabOfNewMediaExcerptMessage {
  action: "notifyTabOfNewMediaExcerpt";
  data: AddMediaExcerptData;
}

export interface NotifyTabsOfDeletedMediaExcerptsMessage {
  action: "notifyTabsOfDeletedMediaExcerpts";
  mediaExcerptId: string;
}

export type ContentMessage =
  | CreateMediaExcerptMessage
  | FocusMediaExcerptMessage
  | RequestUrlInfoMessage
  | UpdateMediaExcerptsMessage
  | UpdateMediaExcerptOutcomesMessage
  | NotifyTabOfNewMediaExcerptMessage
  | NotifyTabsOfDeletedMediaExcerptsMessage;

export function getTabUrlInfo(tabId: number): Promise<UrlInfo> {
  const message: RequestUrlInfoMessage = {
    action: "requestUrlInfo",
  };
  return chrome.tabs.sendMessage(tabId, message);
}

export async function sendUpdatedMediaExcerpts({
  add,
  remove,
}: MediaExcerptUpdates) {
  const message: UpdateMediaExcerptsMessage = {
    action: "updateMediaExcerpts",
    add,
    remove,
  };

  await sendMessageToAllCompleteTabs(message);
}

export async function sendUpdatedMediaExcerptOutcomes(
  updatedOutcomes: Map<string, BasisOutcome | undefined>,
) {
  const serializedUpdatedOutcomes = serializeMap(updatedOutcomes);
  const message: UpdateMediaExcerptOutcomesMessage = {
    action: "updateMediaExcerptOutcomes",
    serializedUpdatedOutcomes,
  };

  await sendMessageToAllCompleteTabs(message);
}

export async function notifyTabsOfDeletedMediaExcerpt(mediaExcerptId: string) {
  const message: NotifyTabsOfDeletedMediaExcerptsMessage = {
    action: "notifyTabsOfDeletedMediaExcerpts",
    mediaExcerptId,
  };
  await sendMessageToAllCompleteTabs(message);
}

async function sendMessageToAllCompleteTabs(message: ContentMessage) {
  const tabs = await getCompleteTabs();
  return Promise.all(
    tabs.map(async (tab) => {
      if (!tab.id) {
        appLogger.error("Tab id is undefined");
        return;
      }
      try {
        return (await chrome.tabs.sendMessage(
          tab.id,
          message,
        )) as Promise<unknown>;
      } catch (error) {
        appLogger.warn("Error sending message to tab:", error);
      }
    }),
  );
}

async function getCompleteTabs() {
  try {
    return await chrome.tabs.query({ status: "complete" });
  } catch (error) {
    appLogger.error("Error querying tabs:", error);
    return [];
  }
}

export async function notifyTabOfNewMediaExcerpt(
  tab: chrome.tabs.Tab,
  data: AddMediaExcerptData,
) {
  if (!tab.id) {
    appLogger.error("Tab id is undefined");
    return;
  }
  const message: NotifyTabOfNewMediaExcerptMessage = {
    action: "notifyTabOfNewMediaExcerpt",
    data,
  };
  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    appLogger.error(
      `Failed to notify tab ${tab.id} of new MediaExcerpt`,
      error,
    );
  }
}
