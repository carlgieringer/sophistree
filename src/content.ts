import { v4 as uuidv4 } from "uuid";

import { AddMediaExcerptData, MediaExcerpt } from "./store/entitiesSlice";
import {
  makeDomAnchorFromSelection,
  DomAnchor,
  getRangesFromDomAnchor,
} from "./anchors";
import { HighlightManager } from "./highlights";

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

interface CreateMediaExcerptMessage {
  action: "createMediaExcerpt";
  selectedText: string;
}
export interface ActivateMediaExcerptMessage {
  action: "activateMediaExcerpt";
  mediaExcerpt: MediaExcerpt;
}

export interface RequestUrlMessage {
  action: "requestUrl";
}

type ContentMessage =
  | CreateMediaExcerptMessage
  | ActivateMediaExcerptMessage
  | RequestUrlMessage;

export type ChromeRuntimeMessage =
  | AddMediaExcerptMessage
  | SelectMediaExcerptMessage
  | GetMediaExcerptsMessage;

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, sender, sendResponse) => {
    switch (message.action) {
      case "createMediaExcerpt":
        createMediaExcerpt(message);
        break;
      case "activateMediaExcerpt":
        activateMediaExcerpt(message.mediaExcerpt);
        break;
      case "requestUrl":
        sendResponse(getCanonicalOrFullUrl());
        break;
      default:
        console.error(`Unknown message action: ${message}`);
        break;
    }
  }
);

function activateMediaExcerpt(mediaExcerpt: MediaExcerpt) {
  highlightManager.activateHighlight(
    (anchor) => anchor.data.mediaExcerptId === mediaExcerpt.id
  );
}

function createMediaExcerpt(message: any) {
  const id = uuidv4();
  const quotation = message.selectedText;
  const url = getUrl();
  const canonicalUrl = getCanonicalUrl();
  const sourceName = getTitle();

  if (!quotation) {
    console.error(`Cannot createMediaExcerpt for empty quotation`);
    return;
  }

  const highlight = highlightCurrentSelection(id);
  if (!highlight) {
    console.error(`Faild to highlight current selection.`);
    return;
  }

  if (highlight.data.mediaExcerptId === id) {
    const data: AddMediaExcerptData = {
      id: highlight.data.mediaExcerptId,
      quotation,
      url,
      canonicalUrl,
      sourceName,
      domAnchor: highlight.anchor,
    };
    const sidebarMessage: ChromeRuntimeMessage = {
      action: "addMediaExcerpt",
      data,
    };
    chrome.runtime.sendMessage(sidebarMessage);
  } else {
    selectMediaExcerpt(highlight.data.mediaExcerptId);
  }
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

function getCanonicalOrFullUrl() {
  return getCanonicalUrl() || getUrl();
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
        console.error("Unable to get media excerpts");
        return;
      }
      const { mediaExcerpts } = response;
      highlightMediaExcerpts(mediaExcerpts);
    }
  );
}
getMediaExcerpts();

function highlightMediaExcerpts(mediaExcerpts: MediaExcerpt[]) {
  mediaExcerpts.forEach(({ id, domAnchor }) => highlightRanges(id, domAnchor));
}

function highlightCurrentSelection(mediaExcerptId: string) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    console.error(`Cannot highlight empty selection.`);
    return undefined;
  }

  const domAnchor = makeDomAnchorFromSelection(selection);
  if (!domAnchor) {
    console.error(`Cannot createMediaExcerpt for empty domAnchor`);
    return undefined;
  }
  return highlightRanges(mediaExcerptId, domAnchor);
}

interface HighlightData {
  mediaExcerptId: string;
}

const highlightManager = new HighlightManager<DomAnchor, HighlightData>(
  document.body,
  getRangesFromDomAnchor
);

function highlightRanges(mediaExcerptId: string, domAnchor: DomAnchor) {
  return highlightManager.createHighlight(
    domAnchor,
    { mediaExcerptId },
    {
      onClick: function highlightOnClick() {
        selectMediaExcerpt(mediaExcerptId);
      },
    }
  );
}

function selectMediaExcerpt(mediaExcerptId: string) {
  const message: SelectMediaExcerptMessage = {
    action: "selectMediaExcerpt",
    data: { mediaExcerptId },
  };
  chrome.runtime.sendMessage(message);
}
