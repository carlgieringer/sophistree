import {
  accessChromeUrlErrorMessage,
  connectionErrorMessage,
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
    const queryInfo = manifest.permissions?.includes("tabs")
      ? { url: cs.matches }
      : {};
    for (const tab of await chrome.tabs.query(queryInfo)) {
      if (tab.url?.match(/^(chrome|chrome-extension):\/\//)) {
        continue;
      }
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

function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
) {
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
  chrome.tabs.sendMessage(tab.id, message).catch((reason) => {
    if (
      reason instanceof Error &&
      reason.message.includes(connectionErrorMessage)
    ) {
      console.warn(
        `Failed to create MediaExcerpt on tab ID ${tab.id} URL ${tab.url}. Is the sidebar open?`,
      );
    } else {
      console.error(
        `Failed to sendMessage createMediaExcerpt to tab ID ${tab.id} URL ${tab.url}`,
        reason,
      );
    }
  });
}

chrome.contextMenus.onClicked.addListener(
  wrapCallback((info, tab) => void handleContextMenuClick(info, tab)),
);

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
