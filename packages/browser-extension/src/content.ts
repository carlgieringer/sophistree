import { v4 as uuidv4 } from "uuid";
import {
  DomAnchorHighlightManager,
  DomAnchor,
  PdfJsAnchorHighlightManager,
  PdfJsAnchorHighlightManagerOptions,
  DomAnchorHighlightManagerOptions,
  HighlightManagerOptions,
  PDFViewerApplication,
} from "tapestry-highlights";
import "tapestry-highlights/rotation-colors.css";

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
import {
  getPdfUrlFromViewerUrl,
  isPdfViewerUrl,
  makeCanonicalPdfUrl,
} from "./pdfs/pdfs";

chrome.runtime.onConnect.addListener(getMediaExcerptsWhenSidebarConnects);
chrome.runtime.onMessage.addListener(
  (message: ContentMessage, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse).catch((reason) => {
      contentLogger.error(
        `Failed to handle Chrome runtime message ${JSON.stringify(message)}`,
        reason,
      );
    });
  },
);

function getMediaExcerptsWhenSidebarConnects(port: chrome.runtime.Port) {
  if (port.name === sidepanelKeepalivePortName) {
    const promise = getMediaExcerpts().catch((error) =>
      contentLogger.error("Failed to get media excerpts", error),
    );
    port.onDisconnect.addListener(() => {
      void promise
        .then(() => highlightManager.removeAllHighlights())
        .catch((error) =>
          contentLogger.error("Failed to remove all highlights", error),
        );
    });
  }
}

export const sidepanelKeepalivePortName = "keepalive";

async function handleMessage(
  message: ContentMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) {
  switch (message.action) {
    case "createMediaExcerpt": {
      await createMediaExcerptFromCurrentSelection(message);
      break;
    }
    case "focusMediaExcerpt":
      await focusMediaExcerpt(message.mediaExcerptId);
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
      await refreshMediaExcerpts();
      break;
    }
    case "notifyTabOfNewMediaExcerpt": {
      highlightNewMediaExcerptIfOnPage(message.data);
      break;
    }
    case "notifyTabsOfDeletedMediaExcerpts": {
      highlightManager.removeHighlights(
        ({ mediaExcerptId }) => mediaExcerptId === message.mediaExcerptId,
      );
    }
  }
}

async function refreshMediaExcerpts() {
  highlightManager.removeAllHighlights();
  await getMediaExcerpts();
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

async function createMediaExcerptFromCurrentSelection(
  message: CreateMediaExcerptMessage,
) {
  const highlight = await createMediaExcerptAndHighlight(message);
  // If the highlight failed to be created in the extension for whatever reason,
  // remove it here.
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

async function focusMediaExcerpt(mediaExcerptId: string) {
  await highlightManager.focusHighlight(
    (data) => data.mediaExcerptId === mediaExcerptId,
  );
}

async function createMediaExcerptAndHighlight(
  message: CreateMediaExcerptMessage,
) {
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

  if (highlight.data.mediaExcerptId === mediaExcerptId) {
    const data: AddMediaExcerptData = {
      id: highlight.data.mediaExcerptId,
      quotation,
      url,
      canonicalUrl,
      sourceName,
      domAnchor: highlight.anchor,
    };
    const success = await createMediaExcerpt(data);
    if (!success) {
      highlightManager.removeHighlight(highlight);
      return undefined;
    }
  } else {
    // The highlight manager already had an equivalent highlight
    await selectMediaExcerpt(highlight.data.mediaExcerptId);
  }
  return highlight;
}

async function createMediaExcerpt(data: AddMediaExcerptData) {
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
    return false;
  }
  return true;
}

function getUrl() {
  const url = window.location.href;
  if (isCurrentPageThePdfViewer()) {
    return getPdfUrlFromViewerUrl(url);
  }
  return url;
}

function getCanonicalUrl() {
  if (isCurrentPageThePdfViewer()) {
    const url = window.location.href;
    const pdfUrl = getPdfUrlFromViewerUrl(url);
    return makeCanonicalPdfUrl(pdfUrl);
  }
  return (
    document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
    undefined
  );
}

function getCanonicalOrFullUrl() {
  return getCanonicalUrl() || getUrl();
}

function isCurrentPageThePdfViewer() {
  return isPdfViewerUrl(window.location.href);
}

function getTitle() {
  if (isCurrentPageThePdfViewer()) {
    return getTitleFromPdfMetadata();
  }
  return (
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content") || document.title
  );
}

function getTitleFromPdfMetadata(): string {
  const pdfViewerApplication = window.PDFViewerApplication;
  if (!pdfViewerApplication) {
    throw new Error(
      "Cannot getTitleFromPdfMetadata if window.PDFViewerApplication is mising. Is the current page the PDF.js viewer?",
    );
  }
  const metadata = pdfViewerApplication.metadata;
  if (metadata.has("dc:title")) {
    const title = metadata.get("dc:title");
    if (title) {
      return title;
    }
  }
  if (metadata.has("title")) {
    const title = metadata.get("title");
    if (title) {
      return title;
    }
  }
  // return the filename
  const pdfUrl = getPdfUrlFromViewerUrl(window.location.href);
  return pdfUrl.split("/").pop() || "";
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

const highlightManager = makeHighlighlightManager();

function makeHighlighlightManager():
  | PdfJsAnchorHighlightManager<HighlightData>
  | DomAnchorHighlightManager<HighlightData> {
  const options: Omit<
    HighlightManagerOptions<unknown, HighlightData>,
    "getRangesFromAnchor"
  > = {
    container: document.body,
    logger: contentLogger,
    isEquivalentHighlight: ({ data: data1 }, { data: data2 }) =>
      data1.mediaExcerptId === data2.mediaExcerptId,
    getHighlightClassNames: ({ mediaExcerptId }) => [
      getHighlightClass(mediaExcerptId),
    ],
  };
  if (isCurrentPageThePdfViewer()) {
    return new PdfJsAnchorHighlightManager<HighlightData>(
      options as PdfJsAnchorHighlightManagerOptions<HighlightData>,
    );
  }
  return new DomAnchorHighlightManager<HighlightData>(
    options as DomAnchorHighlightManagerOptions<HighlightData>,
  );
}

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
  highlightManager.updateHighlightsClassNames(({ mediaExcerptId }) =>
    updatedOutcomes.has(mediaExcerptId),
  );
}

function getHighlightClass(mediaExcerptId: string) {
  const outcome = mediaExcerptOutcomes.get(mediaExcerptId);
  if (!outcome) {
    return "highlight-color-default";
  }
  const valence = outcomeValence(outcome);
  return `highlight-color-${valence}`;
}

function createHighlight(mediaExcerptId: string, anchor: DomAnchor) {
  return highlightManager.createHighlight(
    anchor,
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

declare global {
  interface Window {
    PDFViewerApplication?: PDFViewerApplication;
  }
}
