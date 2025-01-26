export type ValidContentTab = Omit<chrome.tabs.Tab, "id"> & {
  id: number;
};

/** Calls callback only if tab is a page with a valid content script. */
export function doWithContentTab(
  tab: chrome.tabs.Tab,
  callback: (tab: ValidContentTab) => void,
): Promise<void>;
export async function doWithContentTab<T>(
  tab: chrome.tabs.Tab,
  callback: (tab: ValidContentTab) => Promise<T> | undefined,
): Promise<T | undefined>;
export async function doWithContentTab<T>(
  tab: chrome.tabs.Tab,
  callback: (tab: ValidContentTab) => void | Promise<T> | undefined,
): Promise<void | T | undefined> {
  if (!tab.id) {
    return;
  }
  try {
    // Successfully sending any message works. Our content script ignores unrecognized messages.
    await chrome.tabs.sendMessage(tab.id, { ping: true });
  } catch {
    // If ping fails, assume it is not a valid content page
    return;
  }

  return callback(tab as ValidContentTab);
}
