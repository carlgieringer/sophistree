import * as textQuote from "dom-anchor-text-quote";

import { DomAnchorHighlightManager } from "../src/DomAnchorHighlightManager.js";
import { HighlightManager } from "../src/HighlightManager.js";

// Put test dependenies on the window

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(window as any).HighlightManager = HighlightManager;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(window as any).DomAnchorHighlightManager = DomAnchorHighlightManager;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(window as any).textQuoteToRange = textQuote.toRange;
