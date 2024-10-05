import { BasisOutcome } from "../outcomes/outcomes";
import { MediaExcerpt } from "../store/entitiesSlice";
import { serializeMap } from "./serialization";

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
  serializedUpdatedOutcomes: [string, BasisOutcome | undefined][];
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

export async function updateMediaExcerptOutcomes(
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
        console.error("Tab id is undefined");
        return;
      }
      try {
        return (await chrome.tabs.sendMessage(
          tab.id,
          message,
        )) as Promise<unknown>;
      } catch (error) {
        console.warn("Error sending message to tab:", error);
      }
    }),
  );
}

async function getCompleteTabs() {
  try {
    return await chrome.tabs.query({ status: "complete" });
  } catch (error) {
    console.error("Error querying tabs:", error);
    return [];
  }
}
