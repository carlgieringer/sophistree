// Import PDF.js library
import * as pdfjs from "pdfjs-dist";
import {
  PDFViewer,
  EventBus,
  PageChangeEvent,
  PDFLinkService,
  PDFHistory,
} from "pdfjs-dist/web/pdf_viewer";

import * as contentLogger from "./logging/contentLogging";

pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs/build/pdf.worker.mjs";

class SophistreePdfApp {
  private container: HTMLDivElement;
  private eventBus: EventBus | undefined;
  private viewer: PDFViewer | undefined;
  private loadingTask: pdfjs.PDFDocumentLoadingTask | undefined;
  private pdfDocument: pdfjs.PDFDocumentProxy | undefined;
  private currentPageNumber: number = 1;

  constructor(container: HTMLDivElement) {
    this.container = container;
  }

  initViewer() {
    this.eventBus = new EventBus();
    const linkService = new PDFLinkService({
      eventBus: this.eventBus,
    });

    this.viewer = new PDFViewer({
      container: this.container,
      eventBus: this.eventBus,
      linkService,
    });

    linkService.setViewer(this.viewer);

    const pdfHistory = new PDFHistory({
      eventBus: this.eventBus,
      linkService,
    });
    linkService.setHistory(pdfHistory);

    // Add event listeners for page changes
    this.viewer.eventBus.on("pagechanging", (evt: PageChangeEvent) => {
      this.currentPageNumber = evt.pageNumber;
    });

    window.addEventListener("resize", this.handleResize.bind(this));
  }

  handleResize() {
    if (this.viewer) {
      this.viewer.currentScaleValue = "auto";
    }
  }

  async open(url: string) {
    if (!this.viewer) {
      throw new Error("Viewer must be initialized before opening a PDF.");
    }

    this.setTitleUsingUrl(url);

    this.loadingTask = pdfjs.getDocument({
      url,
      cMapUrl: "pdfjs/cmaps/",
      cMapPacked: true,
    });
    this.loadingTask.onProgress = ({
      loaded,
      total,
    }: pdfjs.OnProgressParameters) => {
      this.setProgress(loaded / total);
    };

    this.pdfDocument = await this.loadingTask.promise;

    this.viewer.setDocument(this.pdfDocument);
    await this.setTitleUsingMetadata(this.pdfDocument);
  }

  setProgress(progress: number) {
    contentLogger.info(`Progress: ${progress}`);
  }

  setTitleUsingUrl(url: string) {
    let title = pdfjs.getFilenameFromUrl(url) || url;
    try {
      title = decodeURIComponent(title);
    } catch {
      // decodeURIComponent may throw URIError,
      // fall back to using the unprocessed url in that case
    }
    this.setTitle(title);
  }

  async setTitleUsingMetadata(pdfDocument: pdfjs.PDFDocumentProxy) {
    const { info, metadata } = await pdfDocument.getMetadata();
    const pdfFormatVersion =
      "PDFFormatVersion" in info ? (info["PDFFormatVersion"] as string) : "N/A";
    const producer =
      "Producer" in info ? (info["Producer"] as string).trim() : "N/A";
    const creator =
      "Creator" in info ? (info["Creator"] as string).trim() : "N/A";
    const pdfJsVersion = pdfjs.version || "N/A";

    // Provides some basic debug information
    console.log(
      `PDF ${pdfDocument.fingerprints[0]} [${pdfFormatVersion} ${producer} / ${creator}] (PDF.js: ${pdfJsVersion})`,
    );

    let pdfTitle;
    if (metadata && metadata.has("dc:title")) {
      const title = metadata.get("dc:title") as string;
      // Ghostscript sometimes returns 'Untitled', so prevent setting the
      // title to 'Untitled.
      if (title !== "Untitled") {
        pdfTitle = title;
      }
    }

    const infoTitle = "Title" in info ? (info["Title"] as string) : undefined;

    if (!pdfTitle && infoTitle) {
      pdfTitle = infoTitle;
    }

    if (pdfTitle) {
      this.setTitle(`${pdfTitle} - ${document.title}`);
    }
  }

  setTitle(title: string) {
    document.title = title;
  }

  getCurrentPage() {
    return this.currentPageNumber;
  }

  getTotalPages() {
    return this.pdfDocument ? this.pdfDocument.numPages : 0;
  }

  // async getPageText(pageNumber) {
  //   const page = await this.pdfDocument.getPage(pageNumber);
  //   const textContent = await page.getTextContent();
  //   return textContent.items.map((item) => item.str).join(" ");
  // }

  // addHighlight(pageNumber, rect, className) {
  //   const page = this.viewer.getPageView(pageNumber - 1);
  //   const highlightLayer =
  //     page.div.querySelector(".highlight-layer") ||
  //     this.createHighlightLayer(page);

  //   const highlight = document.createElement("div");
  //   highlight.className = `pdf-highlight ${className}`;
  //   highlight.style.left = `${rect.left}px`;
  //   highlight.style.top = `${rect.top}px`;
  //   highlight.style.width = `${rect.width}px`;
  //   highlight.style.height = `${rect.height}px`;

  //   highlightLayer.appendChild(highlight);
  //   return highlight;
  // }

  // createHighlightLayer(page) {
  //   const highlightLayer = document.createElement("div");
  //   highlightLayer.className = "highlight-layer";
  //   highlightLayer.style.position = "absolute";
  //   highlightLayer.style.top = "0";
  //   highlightLayer.style.left = "0";
  //   highlightLayer.style.right = "0";
  //   highlightLayer.style.bottom = "0";
  //   highlightLayer.style.pointerEvents = "none";
  //   page.div.appendChild(highlightLayer);
  //   return highlightLayer;
  // }

  // removeHighlight(highlight) {
  //   if (highlight && highlight.parentNode) {
  //     highlight.parentNode.removeChild(highlight);
  //   }
  // }

  // Add more methods as needed for your specific use case
}

function getContainer() {
  const containerId = "pdf-viewer-container";
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Missing PDF viewer container #${containerId}`);
  }
  if (!(container instanceof HTMLDivElement)) {
    throw new Error(`PDF viewer container #${containerId} is not a div`);
  }
  return container;
}

const pdfApp = new SophistreePdfApp(getContainer());

const domContentLoaded = new Promise<void>((resolve) => {
  document.addEventListener("DOMContentLoaded", () => {
    pdfApp.initViewer();
    resolve();
  });
});

const animationStarted = new Promise(function (resolve) {
  window.requestAnimationFrame(resolve);
});

Promise.all([domContentLoaded, animationStarted])
  .then(function () {
    const url = getPdfUrl();
    return pdfApp.open(url);
  })
  .catch((reason) => {
    contentLogger.error("Failed to initialize Sophistree PDF viewer.", reason);
  });

function getPdfUrl() {
  const windowUrl = new URL(window.location.href);
  const url = windowUrl.searchParams.get("file");
  if (!url) {
    throw new Error("Curent page URL is missing PDF file query param.");
  }
  return url;
}
