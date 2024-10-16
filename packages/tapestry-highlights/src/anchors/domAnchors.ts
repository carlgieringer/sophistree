import * as textPosition from "dom-anchor-text-position";
import * as textQuote from "dom-anchor-text-quote";
import { GenerateFragmentStatus } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
import type { TextFragment } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
import { processTextFragmentDirective } from "text-fragments-polyfill/text-fragment-utils";
import { generateFragmentFromRange } from "text-fragments-polyfill/dist/fragment-generation-utils.js";
import type { Logger } from "../logger.js";

export interface DomAnchor {
  fragment?: TextFragment;
  text: textQuote.TextQuoteAnchor;
  position: textPosition.TextPositionAnchor;
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
    } else {
      logger.warn(
        `Failed to get ranges from text fragment: ${JSON.stringify(domAnchor.fragment)}`,
      );
    }
  }
  const range =
    textQuote.toRange(root, domAnchor.text) ??
    textPosition.toRange(root, domAnchor.position);
  return range ? [range] : [];
}

export function makeDomAnchorFromSelection(selection: Selection): DomAnchor {
  const range = selection.getRangeAt(0);
  return makeDomAnchorFromRange(range);
}

export function makeDomAnchorFromRange(range: Range): DomAnchor {
  const text = textQuote.fromRange(window.document.body, range);
  const position = textPosition.fromRange(window.document.body, range);
  const result = generateFragmentFromRange(range);
  const fragment =
    result.status === GenerateFragmentStatus.SUCCESS
      ? result.fragment
      : undefined;
  return {
    text,
    position,
    fragment,
  };
}
