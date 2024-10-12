import { v4 as uuidv4 } from "uuid";
import { DomAnchorHighlightManager, DomAnchor } from "tapestry-highlights";
import "tapestry-highlights-byo-anchor/rotation-colors.scss";
import "./highlights/outcome-colors.scss";

import { AddMediaExcerptData, MediaExcerpt } from "./store/entitiesSlice";
import type {
  ContentMessage,
  CreateMediaExcerptMessage,
  GetMediaExcerptsResponse,
} from "./extension/messages";
import { BasisOutcome } from "./outcomes/outcomes";
import { outcomeValence } from "./outcomes/valences";
import { deserializeMap } from "./extension/serialization";
import { connectionErrorMessage } from "./extension/errorMessages";
import * as contentLogger from "./logging/contentLogging";

chrome.runtime.onConnect.addListener(getMediaExcerptsWhenSidebarConnects);
chrome.runtime.onMessage.addListener(handleMessage);

function getMediaExcerptsWhenSidebarConnects(port: chrome.runtime.Port) {
  if (port.name === sidepanelKeepalivePortName) {
    void getMediaExcerpts();
    port.onDisconnect.addListener(() => {
      highlightManager.removeAllHighlights();
    });
  }
}

export const sidepanelKeepalivePortName = "keepalive";

function handleMessage(
  message: ContentMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) {
  switch (message.action) {
    case "createMediaExcerpt": {
      void createMediaExcerptAndCheckItExists(message);
      break;
    }
    case "focusMediaExcerpt":
      focusMediaExcerpt(message.mediaExcerptId);
      break;
    case "requestUrl":
      sendResponse(getCanonicalOrFullUrl());
      return;
    case "updateMediaExcerptOutcomes": {
      const updatedOutcomes = deserializeMap(message.serializedUpdatedOutcomes);
      updateMediaExcerptOutcomes(updatedOutcomes);
      break;
    }
    case "refreshMediaExcerpts": {
      highlightManager.removeAllHighlights();
      void getMediaExcerpts();
      break;
    }
    case "notifyTabOfNewMediaExcerpt": {
      highlightNewMediaExcerptIfOnPage(message.data);
      break;
    }
    case "notifyTabsOfDeletedMediaExcerpts": {
      highlightManager.removeHighlights(
        (h) => h.data.mediaExcerptId === message.mediaExcerptId,
      );
    }
  }
}

function highlightNewMediaExcerptIfOnPage(data: AddMediaExcerptData) {
  const canonicalUrl = getCanonicalUrl();
  if (canonicalUrl) {
    if (canonicalUrl !== data.canonicalUrl) {
      return;
    }
  } else {
    const url = getUrl();
    if (url !== data.url) {
      return;
    }
  }

  createHighlight(data.id, data.domAnchor);
}

async function createMediaExcerptAndCheckItExists(
  message: CreateMediaExcerptMessage,
) {
  const highlight = await createMediaExcerpt(message);
  if (highlight && !(await getMediaExcerpt(highlight.data.mediaExcerptId))) {
    highlightManager.removeHighlight(highlight);
  }
}

async function getMediaExcerpt(mediaExcerptId: string) {
  try {
    return await chrome.runtime.sendMessage<GetMediaExcerptMessage, boolean>({
      action: "getMediaExcerpt",
      data: {
        mediaExcerptId,
      },
    });
  } catch (error) {
    contentLogger.error("Error checking media excerpt existence", error);
    return false;
  }
}

function focusMediaExcerpt(mediaExcerptId: string) {
  highlightManager.focusHighlight(
    (h) => h.data.mediaExcerptId === mediaExcerptId,
  );
}

async function createMediaExcerpt(message: CreateMediaExcerptMessage) {
  const mediaExcerptId = uuidv4();
  const quotation = message.selectedText;
  const url = getUrl();
  const canonicalUrl = getCanonicalUrl();
  const sourceName = getTitle();

  if (!quotation) {
    contentLogger.error(`Cannot createMediaExcerpt for empty quotation`);
    return;
  }

  const highlight = highlightManager.createHighlightFromCurrentSelection(
    {
      mediaExcerptId,
    },
    {
      onClick: function highlightOnClick() {
        void selectMediaExcerpt(mediaExcerptId);
      },
    },
  );
  if (!highlight) {
    contentLogger.error(`Failed to highlight current selection.`);
    return;
  }

  if (highlight.data.mediaExcerptId === mediaExcerptId) {
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
        contentLogger.error(
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
    if (
      error instanceof Error &&
      error.message.includes(connectionErrorMessage)
    ) {
      // This is expected when the sidebar is not open.
    } else {
      contentLogger.error(
        "Unable to connect to extension to get media excerpts.",
        error,
      );
    }
    return;
  }
  const { mediaExcerpts, serializedOutcomes } = response;
  mediaExcerptOutcomes = deserializeMap(serializedOutcomes);
  highlightMediaExcerpts(mediaExcerpts);
}

function highlightMediaExcerpts(mediaExcerpts: MediaExcerpt[]) {
  mediaExcerpts.forEach(({ id, domAnchor }) => createHighlight(id, domAnchor));
}

interface HighlightData {
  mediaExcerptId: string;
}

const highlightManager = new DomAnchorHighlightManager<HighlightData>({
  container: document.body,
  logger: contentLogger,
  colors: {
    mode: "class-callback",
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

function createHighlight(mediaExcerptId: string, domAnchor: DomAnchor) {
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

interface GetMediaExcerptMessage {
  action: "getMediaExcerpt";
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
  | GetMediaExcerptMessage
  | GetMediaExcerptsMessage;
