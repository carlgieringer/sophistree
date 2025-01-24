export type ValidContentTab = Omit<
  chrome.tabs.Tab,
  "id" | "discarded" | "url"
> & {
  id: number;
  discarded: false;
  url: string;
};

export function isValidContentTab(
  tab: chrome.tabs.Tab,
): tab is ValidContentTab {
  return !!tab.id && !tab.discarded && !!tab.url;
}
