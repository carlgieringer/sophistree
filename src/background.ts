const addToSophistreeContextMenuId =
  process.env.NODE_ENV === "production"
    ? "addToSophistree"
    : "addToSophistreeDev";
const addToSophistreeContextMenuTitle =
  process.env.NODE_ENV === "production" ? "+ Sophistree" : "+ Sophistree (Dev)";

chrome.runtime.onInstalled.addListener(
  async function installContentScriptsInOpenTabs() {
    const contentScripts = chrome.runtime.getManifest().content_scripts;
    if (!contentScripts) {
      return;
    }
    for (const cs of contentScripts) {
      for (const tab of await chrome.tabs.query({ url: cs.matches })) {
        if (tab.url?.match(/(chrome|chrome-extension):\/\//gi)) {
          continue;
        }
        const tabId = tab.id;
        if (!tabId) {
          continue;
        }
        const target = { tabId: tabId, allFrames: cs.all_frames };
        if (cs.js?.[0])
          chrome.scripting.executeScript({
            files: cs.js,
            injectImmediately: cs.run_at === "document_start",
            world: "world" in cs ? cs.world : undefined,
            target,
          });
        if (cs.css?.[0])
          chrome.scripting.insertCSS({
            files: cs.css,
            origin:
              "origin" in cs
                ? (cs.origin as chrome.scripting.StyleOrigin)
                : undefined,
            target,
          });
      }
    }
  },
);

chrome.runtime.onInstalled.addListener(function installContextMenus() {
  chrome.contextMenus.create({
    id: addToSophistreeContextMenuId,
    title: addToSophistreeContextMenuTitle,
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(
  function onClickContxtMenu(info, tab) {
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
    chrome.tabs
      .sendMessage(tab.id, {
        action: "createMediaExcerpt",
        selectedText: info.selectionText,
      })
      .catch((reason) => {
        console.error(
          `Failed to sendMessage createMediaExcerpt to ${tab.url}`,
          reason,
        );
      });
  },
);

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
