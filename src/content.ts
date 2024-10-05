import { v4 as uuidv4 } from "uuid";

import { AddMediaExcerptData, MediaExcerpt } from "./store/entitiesSlice";
import {
  makeDomAnchorFromSelection,
  DomAnchor,
  getRangesFromDomAnchor,
} from "./anchors";
import { HighlightManager } from "./highlights";
import "./highlights/rotation-colors.scss";
import "./highlights/outcome-colors.scss";
import {
  ContentMessage,
  CreateMediaExcerptMessage,
  GetMediaExcerptsResponse,
} from "./extension/messages";
import { BasisOutcome } from "./outcomes/outcomes";
import { outcomeValence } from "./outcomes/valences";
import { deserializeMap } from "./extension/serialization";
import { connectionErrorMessage, wrapCallback } from "./extension/callbacks";

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

interface CheckMediaExcerptExistenceMessage {
  action: "checkMediaExcerptExistence";
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
  | CheckMediaExcerptExistenceMessage
  | GetMediaExcerptsMessage;

chrome.runtime.onMessage.addListener(
  wrapCallback(
    (
      message: ContentMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ) => handleMessage(message, sendResponse),
  ),
);

async function handleMessage(
  message: ContentMessage,
  sendResponse: (response: unknown) => void,
) {
  switch (message.action) {
    case "createMediaExcerpt": {
      const highlight = await createMediaExcerpt(message);
      if (
        highlight &&
        !(await mediaExcerptExists(highlight?.data.mediaExcerptId))
      ) {
        highlightManager.removeHighlight(highlight);
      }
      break;
    }
    case "focusMediaExcerpt":
      focusMediaExcerpt(message.mediaExcerptId);
      break;
    case "requestUrl":
      sendResponse(getCanonicalOrFullUrl());
      break;
    case "updateMediaExcerptOutcomes": {
      const updatedOutcomes = deserializeMap(message.serializedUpdatedOutcomes);
      updateMediaExcerptOutcomes(updatedOutcomes);
      break;
    }
  }
}

async function mediaExcerptExists(mediaExcerptId: string) {
  try {
    return await chrome.runtime.sendMessage<
      CheckMediaExcerptExistenceMessage,
      boolean
    >({
      action: "checkMediaExcerptExistence",
      data: {
        mediaExcerptId,
      },
    });
  } catch (error) {
    console.error(connectionErrorMessage, error);
    return false;
  }
}

function focusMediaExcerpt(mediaExcerptId: string) {
  highlightManager.focusHighlight(
    (anchor) => anchor.data.mediaExcerptId === mediaExcerptId,
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
    const message: AddMediaExcerptMessage = {
      action: "addMediaExcerpt",
      data,
    };
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes(connectionErrorMessage)
      ) {
        window.alert("Please open the Sophistree sidebar to add excerpts");
      } else {
        console.error(
          `Unable to connect to extension to add media excerpt.`,
          error,
        );
      }
      highlightManager.removeHighlight(highlight);
      return undefined;
    }
  } else {
    await selectMediaExcerpt(highlight.data.mediaExcerptId);
  }
  return highlight;
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

let mediaExcerptOutcomes: Map<string, BasisOutcome> = new Map();
async function getMediaExcerpts() {
  const url = getUrl();
  const canonicalUrl = getCanonicalUrl();
  const message: GetMediaExcerptsMessage = {
    action: "getMediaExcerpts",
    data: {
      url,
      canonicalUrl,
    },
  };
  let response: GetMediaExcerptsResponse;
  try {
    response = await chrome.runtime.sendMessage(message);
  } catch (error) {
    const message = "Unable to connect to extension to get media excerpts.";
    if (
      error instanceof Error &&
      error.message.includes(connectionErrorMessage)
    ) {
      console.warn(`${message} Is the sidebar open?`);
    } else {
      console.error(message, error);
    }
    return;
  }
  const { mediaExcerpts, serializedOutcomes } = response;
  mediaExcerptOutcomes = deserializeMap(serializedOutcomes);
  highlightMediaExcerpts(mediaExcerpts);
}
void getMediaExcerpts();

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

const highlightManager = new HighlightManager<DomAnchor, HighlightData>({
  container: document.body,
  getRangesFromAnchor: (anchor: DomAnchor) =>
    getRangesFromDomAnchor(document.body, anchor),
  colors: {
    mode: "callback",
    // Corresponds to the classes in highlights/colors.scss
    getColorClass: (data) => getHighlightColorClass(data.mediaExcerptId),
  },
});

function updateMediaExcerptOutcomes(
  updatedOutcomes: Map<string, BasisOutcome | undefined>,
) {
  updatedOutcomes.forEach((outcome, mediaExcerptId) => {
    if (outcome) {
      mediaExcerptOutcomes.set(mediaExcerptId, outcome);
    } else {
      mediaExcerptOutcomes.delete(mediaExcerptId);
    }
  });
  highlightManager.updateHighlightsColorClass((highlight) =>
    updatedOutcomes.has(highlight.data.mediaExcerptId),
  );
}

function getHighlightColorClass(mediaExcerptId: string) {
  const outcome = mediaExcerptOutcomes.get(mediaExcerptId);
  if (!outcome) {
    return "highlight-color-default";
  }
  const valence = outcomeValence(outcome);
  return `highlight-color-${valence}`;
}

function highlightRanges(mediaExcerptId: string, domAnchor: DomAnchor) {
  return highlightManager.createHighlight(
    domAnchor,
    { mediaExcerptId },
    {
      onClick: function highlightOnClick() {
        void selectMediaExcerpt(mediaExcerptId);
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
