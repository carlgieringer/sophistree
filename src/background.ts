import {
  accessChromeUrlErrorMessage,
  wrapCallback,
} from "./extension/callbacks";
import { CreateMediaExcerptMessage } from "./extension/messages";

const addToSophistreeContextMenuId =
  process.env.NODE_ENV === "production"
    ? "addToSophistree"
    : "addToSophistreeDev";
const addToSophistreeContextMenuTitle =
  process.env.NODE_ENV === "production" ? "+ Sophistree" : "+ Sophistree (Dev)";

chrome.runtime.onInstalled.addListener(
  wrapCallback(() => void installContentScriptsInOpenTabs()),
);

async function installContentScriptsInOpenTabs() {
  const manifest = chrome.runtime.getManifest();
  const contentScripts = manifest.content_scripts;
  if (!contentScripts) {
    return;
  }
  for (const cs of contentScripts) {
    for (const tab of await chrome.tabs.query({})) {
      if (!tab.id) {
        continue;
      }
      const target = { tabId: tab.id, allFrames: cs.all_frames };
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
            console.warn(
              `Failed to executeScript [${cs.js.join(",")}] in tab ID ${tab.id} URL: ${tab.url}`,
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
            console.warn(
              `Failed to insertCSS [${cs.css.join(",")}] in tab ID ${tab.id} URL: ${tab.url}`,
              e,
            );
          }
        }
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(
  wrapCallback(function installContextMenus() {
    chrome.contextMenus.create({
      id: addToSophistreeContextMenuId,
      title: addToSophistreeContextMenuTitle,
      contexts: ["selection"],
    });
  }),
);

chrome.contextMenus.onClicked.addListener(
  wrapCallback(async function handleContextMenuClick(info, tab) {
    if (info.menuItemId !== addToSophistreeContextMenuId) {
      return;
    }
    if (!info.selectionText) {
      console.log(`info.selectionText was missing`);
      return;
    }
    if (!tab?.id) {
      console.log(`tab.id was missing`);
      return;
    }

    const message: CreateMediaExcerptMessage = {
      action: "createMediaExcerpt",
      selectedText: info.selectionText,
    };
    try {
      await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      console.error(
        `Failed to sendMessage createMediaExcerpt to tab ID ${tab.id} URL ${tab.url}. Is the content script loaded?`,
        error,
      );
    }
  }),
);

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
