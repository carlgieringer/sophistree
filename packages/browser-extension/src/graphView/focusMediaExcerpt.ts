import { isMatchingUrlInfo, MediaExcerpt, UrlInfo } from "@sophistree/common";

import { getTabUrlInfo, FocusMediaExcerptMessage } from "../extension/messages";
import { catchErrors } from "../extension/callbacks";
import * as appLogger from "../logging/appLogging";
import { tabConnectDelayMillis } from "../App";

export async function focusMediaExcerpt(mediaExcerpt: MediaExcerpt) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  const tabId = await getOrOpenTab(activeTab, mediaExcerpt.urlInfo);

  const mediaExcerptId = mediaExcerpt.id;
  const message: FocusMediaExcerptMessage = {
    action: "focusMediaExcerpt",
    mediaExcerptId,
  };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    appLogger.error(`Failed to send focusMediaExcerpt message to tab`, error);
  }
}

async function getOrOpenTab(
  activeTab: chrome.tabs.Tab,
  urlInfo: UrlInfo,
): Promise<number> {
  if (!activeTab.id) {
    throw new Error("Active tab ID was missing. This should never happen.");
  }
  // activeTab.url is often missing, so we request it from the tab.
  let tabUrlInfo = undefined;
  try {
    tabUrlInfo = await getTabUrlInfo(activeTab.id);
  } catch (error) {
    appLogger.error(`Failed to getTabUrl`, error);
  }
  if (tabUrlInfo && isMatchingUrlInfo(urlInfo, tabUrlInfo)) {
    return activeTab.id;
  }
  const tabIdPromise = waitForTabId(activeTab.id);
  window.open(urlInfo.url);
  return tabIdPromise;
}

function waitForTabId(openerTabId: number): Promise<number> {
  return new Promise((resolve) => {
    chrome.tabs.onCreated.addListener(function tabCreatedListener(
      tab: chrome.tabs.Tab,
    ) {
      catchErrors(() => {
        if (tab.openerTabId === openerTabId) {
          chrome.tabs.onUpdated.addListener(
            function onUpdatedListener(tabId, info) {
              catchErrors(() => {
                if (info.status === "complete" && tabId === tab.id) {
                  chrome.tabs.onUpdated.removeListener(onUpdatedListener);
                  chrome.tabs.onCreated.removeListener(tabCreatedListener);
                  // Give the tab time to load the highlights.
                  setTimeout(() => resolve(tabId), 1.1 * tabConnectDelayMillis);
                }
              });
            },
          );
        }
      });
    });
  });
}
