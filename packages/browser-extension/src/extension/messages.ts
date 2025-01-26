import { BasisOutcome, MediaExcerpt, UrlInfo } from "@sophistree/common";
import { AddMediaExcerptData } from "../store/entitiesSlice";
import { serializeMap } from "./serialization";
import * as appLogger from "../logging/contentLogging";
import { doWithContentTab } from "./tabs";

export const sidePanelKeepalivePortName = "keepalive";

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

export interface SyncMediaExcerptsMessage extends MediaExcerptUpdates {
  action: "syncMediaExcerpts";
}

export interface MediaExcerptUpdates {
  add: MediaExcerpt[];
  // The IDs of the MediaExcerpts to remove
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
  | SyncMediaExcerptsMessage
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
  const message: SyncMediaExcerptsMessage = {
    action: "syncMediaExcerpts",
    add,
    remove,
  };

  await sendMessageToAllContentTabs(message);
}

export async function sendUpdatedMediaExcerptOutcomes(
  updatedOutcomes: Map<string, BasisOutcome | undefined>,
) {
  const serializedUpdatedOutcomes = serializeMap(updatedOutcomes);
  const message: UpdateMediaExcerptOutcomesMessage = {
    action: "updateMediaExcerptOutcomes",
    serializedUpdatedOutcomes,
  };

  await sendMessageToAllContentTabs(message);
}

export async function notifyTabsOfDeletedMediaExcerpt(mediaExcerptId: string) {
  const message: NotifyTabsOfDeletedMediaExcerptsMessage = {
    action: "notifyTabsOfDeletedMediaExcerpts",
    mediaExcerptId,
  };
  await sendMessageToAllContentTabs(message);
}

async function sendMessageToAllContentTabs(message: ContentMessage) {
  const tabs = await getCompleteTabs();
  return Promise.all(
    tabs.map(async (tab) => {
      await doWithContentTab(tab, (tab) => {
        try {
          return chrome.tabs.sendMessage(tab.id, message);
        } catch (error) {
          appLogger.warn("Error sending message to tab:", error);
        }
      });
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
