import * as textQuote from "dom-anchor-text-quote";
import { GenerateFragmentStatus } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
import type { TextFragment } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
import { processTextFragmentDirective } from "text-fragments-polyfill/text-fragment-utils";
import { generateFragmentFromRange } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
import type { Logger } from "../logger.js";

export interface DomAnchor {
  fragment?: TextFragment;
  text: textQuote.TextQuoteAnchor;
  pdf?: {
    pageNumber: number;
    pageLabel: string;
  };
}

export function getRangesFromDomAnchor(
  root: HTMLElement,
  domAnchor: DomAnchor,
  logger: Logger = console,
): Range[] {
  if (domAnchor.fragment) {
    const ranges = processTextFragmentDirective(domAnchor.fragment);
    // processTextFragmentDirective returns an empty array when it fails
    if (ranges.length) {
      return ranges;
      // Missing anchors are common in PDF.js which renders a few pages at a time.
    } else if (!domAnchor.pdf) {
      logger.info(
        `Failed to get ranges from text fragment: ${JSON.stringify(domAnchor.fragment)}`,
      );
    }
  }
  const range = textQuote.toRange(root, domAnchor.text);
  return range ? [range] : [];
}

export function makeDomAnchorFromSelection(selection: Selection): DomAnchor {
  const range = selection.getRangeAt(0);
  return makeDomAnchorFromRange(range);
}

export function makeDomAnchorFromRange(range: Range): DomAnchor {
  const text = textQuote.fromRange(window.document.body, range);
  const result = generateFragmentFromRange(range);
  const fragment =
    result.status === GenerateFragmentStatus.SUCCESS
      ? result.fragment
      : undefined;
  const pdfViewerApplication = window.PDFViewerApplication;
  if (pdfViewerApplication) {
    const pageNumber = pdfViewerApplication.pdfViewer.currentPageNumber;
    const pageLabel = pdfViewerApplication.pdfViewer.currentPageLabel;
    return {
      text,
      fragment,
      pdf: {
        pageNumber,
        pageLabel,
      },
    };
  }
  return {
    text,
    fragment,
  };
}
