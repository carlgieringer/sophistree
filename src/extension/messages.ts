import { BasisOutcome } from "../outcomes/outcomes";
import { MediaExcerpt } from "../store/entitiesSlice";
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

export interface RequestUrlMessage {
  action: "requestUrl";
}

export interface UpdateMediaExcerptOutcomesMessage {
  action: "updateMediaExcerptOutcomes";
  serializedUpdatedOutcomes: [string, BasisOutcome | undefined][];
}

export type GetMediaExcerptsResponse = {
  mediaExcerpts: MediaExcerpt[];
  serializedOutcomes: [string, BasisOutcome][];
};

export type ContentMessage =
  | CreateMediaExcerptMessage
  | FocusMediaExcerptMessage
  | RequestUrlMessage
  | UpdateMediaExcerptOutcomesMessage;

export function getTabUrl(tabId: number): Promise<string> {
  const message: RequestUrlMessage = {
    action: "requestUrl",
  };
  return chrome.tabs.sendMessage(tabId, message);
}

export async function sendUpdatedMediaExcerptOutcomes(
  updatedOutcomes: Map<string, BasisOutcome | undefined>,
) {
  const serializedUpdatedOutcomes = serializeMap(updatedOutcomes);
  const message: UpdateMediaExcerptOutcomesMessage = {
    action: "updateMediaExcerptOutcomes",
    serializedUpdatedOutcomes,
  };

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
