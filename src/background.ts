import { wrapCallback } from "./extension/callbacks";
import { accessChromeUrlErrorMessage } from "./extension/errorMessages";
import {
  CreateMediaExcerptMessage,
  RequestUrlMessage,
} from "./extension/messages";
import * as appLogger from "./logging/appLogging";

chrome.runtime.onInstalled.addListener(
  wrapCallback(installContentScriptsInOpenTabs),
);
chrome.runtime.onInstalled.addListener(wrapCallback(installContextMenus));
chrome.tabs.onActivated.addListener(
  wrapCallback(installContentScriptIfNecessary),
);
chrome.contextMenus.onClicked.addListener(wrapCallback(handleContextMenuClick));
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const addToSophistreeContextMenuId =
  process.env.NODE_ENV === "production"
    ? "addToSophistree"
    : "addToSophistreeDev";
const addToSophistreeContextMenuTitle =
  process.env.NODE_ENV === "production" ? "+ Sophistree" : "+ Sophistree (Dev)";

async function installContentScriptsInOpenTabs() {
  try {
    for (const tab of await chrome.tabs.query({})) {
      if (!tab.id) {
        continue;
      }
      await installContentScriptsInTab(tab.id);
    }
  } catch (error) {
    appLogger.error("Failed to install content scripts in open tabs", error);
  }
}

async function installContentScriptIfNecessary(
  activeInfo: chrome.tabs.TabActiveInfo,
) {
  const { tabId } = activeInfo;
  if (!(await isContentScriptInstalled(tabId))) {
    await installContentScriptsInTab(tabId);
  }
}

async function isContentScriptInstalled(tabId: number) {
  const message: RequestUrlMessage = {
    action: "requestUrl",
  };
  try {
    const url: string | undefined = await chrome.tabs.sendMessage(
      tabId,
      message,
    );
    return url !== undefined;
  } catch {
    return false;
  }
}

async function installContentScriptsInTab(tabId: number) {
  const manifest = chrome.runtime.getManifest();
  const contentScripts = manifest.content_scripts;
  if (!contentScripts) {
    return;
  }
  for (const cs of contentScripts) {
    const target = { tabId, allFrames: cs.all_frames };
    if (cs.js) {
      try {
        await chrome.scripting.executeScript({
          files: cs.js,
          injectImmediately: cs.run_at === "document_start",
          world: "world" in cs ? cs.world : undefined,
          target,
        });
      } catch (e) {
        if (
          e instanceof Error &&
          e.message.includes(accessChromeUrlErrorMessage)
        ) {
          // Ignore this error, it's expected when trying to inject into chrome:// URLs.
          // We don't request tabs permission to be able to limit which tabs we process.
          continue;
        } else {
          appLogger.warn(
            `Failed to executeScript [${cs.js.join(",")}] in tab ID ${tabId} `,
            e,
          );
        }
      }
    }
    if (cs.css) {
      try {
        await chrome.scripting.insertCSS({
          files: cs.css,
          origin:
            "origin" in cs
              ? (cs.origin as chrome.scripting.StyleOrigin)
              : undefined,
          target,
        });
      } catch (e) {
        if (
          e instanceof Error &&
          e.message.includes(accessChromeUrlErrorMessage)
        ) {
          // Ignore this error, it's expected when trying to inject into chrome:// URLs.
          // We don't request tabs permission to be able to limit which tabs we process.
          continue;
        } else {
          appLogger.warn(
            `Failed to insertCSS [${cs.css.join(",")}] in tab ID ${tabId}`,
            e,
          );
        }
      }
    }
  }
}

function installContextMenus() {
  chrome.contextMenus.create({
    id: addToSophistreeContextMenuId,
    title: addToSophistreeContextMenuTitle,
    contexts: ["selection"],
  });
}

async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
) {
  if (info.menuItemId !== addToSophistreeContextMenuId) {
    return;
  }
  if (!info.selectionText) {
    appLogger.info(`info.selectionText was missing`);
    return;
  }
  if (!tab?.id) {
    appLogger.info(`tab.id was missing`);
    return;
  }

  const message: CreateMediaExcerptMessage = {
    action: "createMediaExcerpt",
    selectedText: info.selectionText,
  };
  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    appLogger.error(
      `Failed to sendMessage createMediaExcerpt to tab ID ${tab.id} URL ${tab.url}. Is the content script loaded?`,
      error,
    );
  }
}
