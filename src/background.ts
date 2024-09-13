const addToSophistreeContextMenuId =
  process.env.NODE_ENV === "production"
    ? "addToSophistree"
    : "addToSophistreeDev";
const addToSophistreeContextMenuTitle =
  process.env.NODE_ENV === "production" ? "+ Sophistree" : "+ Sophistree (Dev)";

chrome.runtime.onInstalled.addListener(() => {
  const id = chrome.contextMenus.create({
    id: addToSophistreeContextMenuId,
    title: addToSophistreeContextMenuTitle,
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(function onClickContxtMenu(
  info,
  tab
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
  chrome.tabs.sendMessage(tab.id, {
    action: "createMediaExcerpt",
    selectionText: info.selectionText,
    url: tab.url,
  });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
