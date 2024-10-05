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
  GetMediaExcerptsMessageResponse,
} from "./extension/messages";
import { BasisOutcome } from "./outcomes/outcomes";
import { outcomeValence } from "./outcomes/valences";
import { deserializeMap } from "./extension/serialization";

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
      await createMediaExcerpt(message);
      break;
    case "activateMediaExcerpt":
      activateMediaExcerpt(message.mediaExcerpt);
      break;
    case "requestUrl":
      return getCanonicalOrFullUrl();
    case "updateMediaExcerptOutcomes": {
      const updatedOutcomes = deserializeMap(message.serializedUpdatedOutcomes);
      updateMediaExcerptOutcomes(updatedOutcomes);
      break;
    }
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

let mediaExcerptOutcomes: Map<string, BasisOutcome> = new Map();
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
      const { mediaExcerpts, serializedOutcomes } = response;
      mediaExcerptOutcomes = deserializeMap(serializedOutcomes);
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
