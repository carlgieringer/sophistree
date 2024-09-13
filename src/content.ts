import { v4 as uuidv4 } from "uuid";
import { AddMediaExcerptData } from "./store/nodesSlice";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "createMediaExcerpt") {
    return;
  }
  const title =
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content") || document.title;
  const id = uuidv4();
  highlightSelection(id);
  const data: AddMediaExcerptData = {
    id,
    quotation: message.selectionText,
    url: message.url,
    sourceName: title,
  };
  chrome.runtime.sendMessage({
    action: "addMediaExcerpt",
    data,
  });
});

function highlightSelection(mediaExcerptId: string) {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    span.style.backgroundColor = "yellow";
    span.dataset.excerptId = mediaExcerptId;
    span.onclick = function highlightOnClick() {
      const message = {
        action: "selectMediaExcerpt",
        data: { mediaExcerptId },
      };
      chrome.runtime.sendMessage(message);
    };

    try {
      range.surroundContents(span);
    } catch (e) {
      console.error("Failed to highlight selection:", e);
    }
  }
}

export {};
