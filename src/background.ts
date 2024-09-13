chrome.action.onClicked.addListener(function openSidePanel(tab) {
  chrome.sidePanel.open({ tabId: tab.id, windowId: tab.windowId });
});
