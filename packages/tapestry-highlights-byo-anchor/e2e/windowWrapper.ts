import { HighlightManager } from "../src/HighlightManager";
import * as textQuote from "dom-anchor-text-quote";

// Put HighlightManager on the window for tests.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(window as any).HighlightManager = HighlightManager;
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(window as any).textQuoteToRange = textQuote.toRange;
