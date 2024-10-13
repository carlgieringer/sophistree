declare module "dom-anchor-text-quote" {
  interface TextQuoteAnchor {
    prefix?: string;
    exact: string;
    suffix?: string;
  }

  interface Options {
    // the quote search will prioritize matches that are closer to this offset over equivalent
    // matches that are farther away.
    hint?: number;
  }
  interface Selector {
    prefix?: string;
    exact?: string;
    suffix?: string;
  }

  function toRange(
    root: HTMLElement,
    selector: Selector,
    options?: Options,
  ): Range | null;
}
