import * as textPosition from "dom-anchor-text-position";
import * as textQuote from "dom-anchor-text-quote";
import {
  generateFragmentFromSelection,
  TextFragment,
  GenerateFragmentStatus,
} from "./textFragments";
import { processTextFragmentDirective } from "text-fragments-polyfill/text-fragment-utils";

export interface DomAnchor {
  text: textQuote.TextQuoteAnchor;
  position: textPosition.TextPositionAnchor;
  fragment?: TextFragment;
}

export function getRangesFromDomAnchor(
  root: HTMLElement,
  domAnchor: DomAnchor,
): Range[] {
  if (domAnchor.fragment) {
    return processTextFragmentDirective(domAnchor.fragment);
  }
  const range =
    textQuote.toRange(root, domAnchor.text) ??
    textPosition.toRange(root, domAnchor.position);
  return range ? [range] : [];
}

export function makeDomAnchorFromSelection(selection: Selection): DomAnchor {
  const range = selection.getRangeAt(0);
  const text = textQuote.fromRange(window.document.body, range);
  const position = textPosition.fromRange(window.document.body, range);
  const result = generateFragmentFromSelection(selection);
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
