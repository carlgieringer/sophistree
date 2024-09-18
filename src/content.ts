import { v4 as uuidv4 } from "uuid";

import { AddMediaExcerptData, MediaExcerpt } from "./store/entitiesSlice";
import {
  DomAnchor,
  makeDomAnchorFromSelection,
  getRangesFromDomAnchor,
} from "./anchors";
import { opacity50, sunflower } from "./colors";

interface AddMediaExcerptMessage {
  action: "addMediaExcerpt";
  data: AddMediaExcerptData;
}

interface SelectMediaExcerptMessage {
  action: "selectMediaExcerpt";
  data: {
    mediaExcerptId: string;
  };
}

interface GetMediaExcerptsMessage {
  action: "getMediaExcerpts";
  data: {
    url: string;
    canonicalUrl?: string;
  };
}

export type ChromeRuntimeMessage =
  | AddMediaExcerptMessage
  | SelectMediaExcerptMessage
  | GetMediaExcerptsMessage;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "createMediaExcerpt":
      createMediaExcerpt(message);
      break;
    case "openUrl":
      openUrl(message.url);
      break;
  }
});

function openUrl(url: string) {
  window.location.href = url;
}

function createMediaExcerpt(message: any) {
  const id = uuidv4();
  const quotation = message.selectedText;
  const url = getUrl();
  const canonicalUrl = getCanonicalUrl();
  const sourceName = getTitle();
  const domAnchor = getDomAnchorFromCurrentSelection();

  if (!quotation) {
    console.error(`Cannot createMediaExcerpt for empty quotation`);
    return;
  }
  if (!domAnchor) {
    console.error(`Cannot createMediaExcerpt for empty domAnchor`);
    return;
  }

  const data: AddMediaExcerptData = {
    id,
    quotation,
    url,
    canonicalUrl,
    sourceName,
    domAnchor,
  };
  const sidebarMessage: ChromeRuntimeMessage = {
    action: "addMediaExcerpt",
    data,
  };
  chrome.runtime.sendMessage(sidebarMessage);

  highlightCurrentSelection(id);
}

function getUrl() {
  return window.location.href;
}

function getCanonicalUrl() {
  return (
    document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
    undefined
  );
}

function getTitle() {
  return (
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content") || document.title
  );
}

type GetMediaExcerptsMessageResponse = {
  mediaExcerpts: MediaExcerpt[];
};

function getMediaExcerpts() {
  const url = getUrl();
  const canonicalUrl = getCanonicalUrl();
  chrome.runtime.sendMessage(
    {
      action: "getMediaExcerpts",
      data: {
        url,
        canonicalUrl,
      },
    },
    function getMediaExcerptsCallback(
      response?: GetMediaExcerptsMessageResponse
    ) {
      if (!response) {
        return;
      }
      const { mediaExcerpts } = response;
      const mediaExcerptRanges = mediaExcerpts
        .flatMap(({ id: mediaExcerptId, domAnchor }) => {
          const ranges = getRangesFromDomAnchor(
            window.document.body,
            domAnchor
          );
          if (!ranges.length) {
            console.error(
              `Unable to highlight domAnchor for mediaExcerptId ${mediaExcerptId}: ${JSON.stringify(
                domAnchor
              )}`
            );
            return [];
          }
          return { mediaExcerptId, ranges };
        })
        // Sort the ranges so that those that encompass others come first, and
        // the inner ones will cover the outer ones so that they are clickable
        .sort((a, b) => {
          const comparison = a.ranges[0].compareBoundaryPoints(
            Range.START_TO_START,
            b.ranges[0]
          );
          return comparison === 0
            ? a.ranges[a.ranges.length - 1].compareBoundaryPoints(
                Range.END_TO_END,
                b.ranges[b.ranges.length - 1]
              )
            : comparison;
        });

      mediaExcerptRanges.forEach(({ mediaExcerptId, ranges }) =>
        highlightRanges(ranges, mediaExcerptId)
      );
    }
  );
}
getMediaExcerpts();

function getDomAnchorFromCurrentSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return undefined;
  }
  return makeDomAnchorFromSelection(selection);
}

function highlightCurrentSelection(mediaExcerptId: string) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }
  const ranges = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }
  highlightRanges(ranges, mediaExcerptId);
}

function highlightRanges(ranges: Range[], mediaExcerptId: string) {
  ranges.forEach((range) => highlightRange(range, mediaExcerptId));
}

function highlightRange(range: Range, mediaExcerptId: string) {
  const span = document.createElement("span");
  span.style.backgroundColor = sunflower + opacity50;
  span.style.cursor = "pointer";
  span.dataset.mediaExcerptId = mediaExcerptId;
  span.onclick = function highlightOnClick() {
    const message: SelectMediaExcerptMessage = {
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
