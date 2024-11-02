import * as textQuote from "dom-anchor-text-quote";

import { DomAnchorHighlightManager } from "../src/DomAnchorHighlightManager.js";
import { HighlightManager } from "../src/HighlightManager.js";

// Put test dependenies on the window
window.HighlightManager = HighlightManager;
window.DomAnchorHighlightManager = DomAnchorHighlightManager;
window.textQuoteToRange = textQuote.toRange;

declare global {
  interface Window {
    HighlightManager: typeof HighlightManager;
    DomAnchorHighlightManager: typeof DomAnchorHighlightManager;
    textQuoteToRange: typeof textQuote.toRange;
  }
}
