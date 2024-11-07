import throttle from "lodash.throttle";

import {
  HighlightManager,
  type HighlightManagerOptions,
  type HighlightHandlers,
  type Highlight,
} from "./HighlightManager.js";

import {
  getRangesFromDomAnchor,
  makeDomAnchorFromRange,
  makeDomAnchorFromSelection,
  type DomAnchor,
} from "./anchors/index.js";
import type { PDFViewerApplication } from "./pdfjs/pdfjs.js";

export type PdfJsAnchorHighlightManagerOptions<Data> = Omit<
  HighlightManagerOptions<DomAnchor, Data>,
  "getRangesFromAnchor"
>;

/** A HighlightManager customized for PDF.js pages. */
export class PdfJsAnchorHighlightManager<Data> extends HighlightManager<
  DomAnchor,
  Data
> {
  private scrollToPagePromiseTimeoutMs: number = 5000;
  private checkFocusHighlightElements: (() => void) | undefined = undefined;
  constructor(options: PdfJsAnchorHighlightManagerOptions<Data>) {
    super({
      ...options,
      getRangesFromAnchor: (anchor: DomAnchor) =>
        getRangesFromDomAnchor(options.container, anchor, options.logger),

      // updateviewarea fires for resizes, too, and we already update highlights for that below.
      eventListeners: { resize: { updateHighlights: false } },

      // Wait for PDF.js to scroll to the page before highlighting.
      beforeFocusHighlight: (highlight) =>
        this.untilHighlightHasElements(highlight),
    });
    this.updateHighlightsWhenPdfViewUpdates();
  }

  private untilHighlightHasElements(
    highlight: Highlight<DomAnchor, Data>,
  ): Promise<void> {
    {
      const {
        anchor: { pdf },
      } = highlight;
      if (!pdf) {
        return Promise.resolve();
      }

      const promise = new Promise<void>((resolve, reject) => {
        this.checkFocusHighlightElements = () => {
          if (!highlight.hasElements()) {
            return;
          }

          this.scrollToHighlight(highlight);
          clearTimeout(timeoutId);
          if (this.checkFocusHighlightElements) {
            highlight.off("newelements", this.checkFocusHighlightElements);
            this.checkFocusHighlightElements = undefined;
          }
          resolve();
        };
        const timeoutId = setTimeout(() => {
          if (this.checkFocusHighlightElements) {
            highlight.off("newelements", this.checkFocusHighlightElements);
            this.checkFocusHighlightElements = undefined;
          }
          reject(
            new Error(
              "Timed out waiting for focused highlight to have elements.",
            ),
          );
        }, this.scrollToPagePromiseTimeoutMs);

        highlight.on("newelements", this.checkFocusHighlightElements);
      });

      const { pageNumber } = pdf;
      pdfViewerApplication().pdfViewer.scrollPageIntoView({
        pageNumber,
      });

      return promise;
    }
  }

  private scrollToHighlight(highlight: Highlight<DomAnchor, Data>) {
    const rects = this.getElementClientRects(highlight);
    // The first rect is sometimes some odd rect towards the beginning of the page. So take the
    // second one.
    const rect =
      rects.length > 1 ? rects[1] : rects.length ? rects[0] : undefined;
    if (!rect) {
      return;
    }
    const pdfContainer = pdfViewerApplication().pdfViewer.container;
    // Scroll the PDF container so that the rect is midway vertically
    // within the container.
    // scrollTop is relative to the beginning of the PDF whereas rect.top
    // is absolutely positioned and so is relative to the current view.
    pdfContainer.scrollTop += rect.top - 0.5 * pdfContainer.offsetHeight;
    pdfContainer.dispatchEvent(new Event("scroll"));
  }

  private updateHighlightsWhenPdfViewUpdates() {
    this.document().addEventListener("webviewerloaded", () => {
      pdfViewerApplication()
        .initializedPromise.then(() => {
          // I think PDF.js captures scrolling and manually shifts its absolutely positioned text layer.
          // So update our highlights too.
          const updateHighlights = throttle(() => {
            this.updateAllHighlightElements();
            this.checkFocusHighlightElements?.();
          }, 10);
          pdfViewerApplication().eventBus.on(
            "updateviewarea",
            updateHighlights,
          );
        })
        .catch((reason) => {
          this.logger().error(
            "Failed to initialize highlight manager in PDF",
            reason,
          );
        });
    });
  }

  createHighlightFromCurrentSelection(
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<DomAnchor, Data> {
    const selection = window.getSelection();
    if (!selection) {
      throw new Error(
        "Cannot create highlight from current selection because there isn't one.",
      );
    }
    return this.createHighlightFromSelection(selection, data, handlers);
  }

  createHighlightFromSelection(
    selection: Selection,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<DomAnchor, Data> {
    if (!selection || selection.isCollapsed) {
      throw new Error("Cannot highlight empty selection.");
    }
    const anchor = makeDomAnchorFromSelection(selection);
    return this.createHighlight(anchor, data, handlers);
  }

  createHighlightFromRange(
    range: Range,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<DomAnchor, Data> {
    const anchor = makeDomAnchorFromRange(range);
    return this.createHighlight(anchor, data, handlers);
  }
}

function pdfViewerApplication(): PDFViewerApplication {
  const { PDFViewerApplication } = window;
  if (!PDFViewerApplication) {
    throw new Error(
      "PDFViewerApplication not found; is the current page the PDF.js viewer?",
    );
  }
  return PDFViewerApplication;
}
