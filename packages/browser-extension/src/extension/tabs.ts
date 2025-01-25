export type ValidContentTab = Omit<
  chrome.tabs.Tab,
  "id" | "discarded" | "url"
> & {
  id: number;
  discarded: false;
  url: string;
};

/** Whether the tab is one we expect has our content script and can be highlighted. */
export function isValidContentTab(
  tab: chrome.tabs.Tab,
): tab is ValidContentTab {
  // Tabs missing a tab ID or URL are ineligble to connect (chrome internal pages etc.)
  // Discarded tabs aren't listening for us to connect
  return !!tab.id && !tab.discarded && !!tab.url;
}
