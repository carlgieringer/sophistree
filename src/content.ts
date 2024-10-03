import { v4 as uuidv4 } from "uuid";

import { AddMediaExcerptData, MediaExcerpt } from "./store/entitiesSlice";
import {
  makeDomAnchorFromSelection,
  DomAnchor,
  getRangesFromDomAnchor,
} from "./anchors";
import { HighlightManager } from "./highlights";
import {
  ContentMessage,
  CreateMediaExcerptMessage,
} from "./extension/messages";

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

chrome.runtime.onMessage.addListener(
  (message: ContentMessage) => void handleMessage(message),
);

async function handleMessage(message: ContentMessage) {
  switch (message.action) {
    case "createMediaExcerpt":
      return createMediaExcerpt(message);
    case "activateMediaExcerpt":
      return activateMediaExcerpt(message.mediaExcerpt);
    case "requestUrl":
      return getCanonicalOrFullUrl();
  }
}

function activateMediaExcerpt(mediaExcerpt: MediaExcerpt) {
  highlightManager.activateHighlight(
    (anchor) => anchor.data.mediaExcerptId === mediaExcerpt.id,
  );
}

async function createMediaExcerpt(message: CreateMediaExcerptMessage) {
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
    await chrome.runtime.sendMessage(sidebarMessage);
  } else {
    await selectMediaExcerpt(highlight.data.mediaExcerptId);
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
      response?: GetMediaExcerptsMessageResponse,
    ) {
      if (!response) {
        console.error("Unable to get media excerpts");
        return;
      }
      const { mediaExcerpts } = response;
      highlightMediaExcerpts(mediaExcerpts);
    },
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
  getRangesFromDomAnchor,
);

function highlightRanges(mediaExcerptId: string, domAnchor: DomAnchor) {
  return highlightManager.createHighlight(
    domAnchor,
    { mediaExcerptId },
    {
      onClick: function highlightOnClick() {
        return void selectMediaExcerpt(mediaExcerptId);
      },
    },
  );
}

async function selectMediaExcerpt(mediaExcerptId: string) {
  const message: SelectMediaExcerptMessage = {
    action: "selectMediaExcerpt",
    data: { mediaExcerptId },
  };
  await chrome.runtime.sendMessage(message);
}
