import * as pdfjs from "pdfjs-dist";
import {
  PDFViewer,
  EventBus,
  PageChangeEvent,
  PDFLinkService,
  PDFHistory,
} from "pdfjs-dist/web/pdf_viewer";

import * as contentLogger from "../logging/contentLogging";

export class SophistreePdfApp {
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

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener("resize", this.handleResize.bind(this));

    const ac = new AbortController();
    const signal = ac.signal;

    const addWindowResolutionChange = (evt?: MediaQueryListEvent) => {
      if (evt) {
        this.viewer?.refresh();
      }
      const mediaQueryList = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`,
      );
      mediaQueryList.addEventListener("change", addWindowResolutionChange, {
        once: true,
        signal,
      });
    };
    addWindowResolutionChange();
  }

  handleResize() {
    this.eventBus?.dispatch("resize", { source: window });
    this.viewer?.update();
    this.viewer?.refresh();
  }

  onResize() {
    const { pdfDocument, viewer } = this;

    if (!pdfDocument) {
      return;
    }
    if (!viewer) {
      return;
    }
    const currentScaleValue = viewer.currentScaleValue;
    if (
      currentScaleValue === "auto" ||
      currentScaleValue === "page-fit" ||
      currentScaleValue === "page-width"
    ) {
      // Note: the scale is constant for 'page-actual'.
      viewer.currentScaleValue = currentScaleValue;
    }
    viewer.update();
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

  async getPageText(pageNumber: number) {
    const page = await this.pdfDocument?.getPage(pageNumber);
    const textContent = await page?.getTextContent();
    return textContent?.items
      .flatMap((item) => ("str" in item ? [item.str] : []))
      .join(" ");
  }
}
