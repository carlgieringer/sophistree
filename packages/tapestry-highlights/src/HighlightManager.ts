import throttle from "lodash.throttle";
import { v4 as uuidv4 } from "uuid";
import deepEqual from "deep-equal";
import merge from "lodash.merge";

import type { Logger } from "./logger.js";
import { combineRects } from "./rects/rects.js";

export type HighlightManagerOptions<Anchor, Data> = {
  /** The container to which the manager will add highlight elements. */
  container: HTMLElement;
  /** A function transforming an anchor into one or more Ranges. */
  getRangesFromAnchor: GetRangesFromAnchorFunction<Anchor>;
  isEquivalentHighlight?: IsEquivalentHighlightFunction<Anchor, Data>;
  /** A function returning one or more extra class names to apply to a highlight's
   * elements. Called initially to get a highlight's classNames. After creating a highlight, call
   * updateHighlightsClassNames to refresh class names based on this callback.
   *
   * If omitted, a class name is added based on the highlight's index and the default number of
   * hightlight colors.
   */
  getHighlightClassNames?: GetHighlightClassNamesFunction<Data>;
  /** The class to apply to all highlight elements. If omitted a default value is used. */
  highlightClass?: string;
  /** The class to apply to hovered highlights. If omitted a default value is used. */
  hoverClass?: string;
  /** The class to apply to focused highlights. If omitted a default value is used. */
  focusClass?: string;
  /** The logger to use. If omitted, window.console is used. */
  logger?: Logger;
  eventListeners?: HighlightManagerEventListenerOptions;
  /** A callback that is called before a highlight is focused. This allows a PDF highlighter to
   * focus the correct page first. */
  beforeFocusHighlight?: (
    highlight: Highlight<Anchor, Data>,
    highlighHasElements: () => boolean,
  ) => Promise<void>;
};
type GetRangesFromAnchorFunction<Anchor> = (anchor: Anchor) => Range[];
type IsEquivalentHighlightFunction<Anchor, Data> = (
  input1: EquivalentHighlightInput<Anchor, Data>,
  input2: EquivalentHighlightInput<Anchor, Data>,
) => boolean;
interface EquivalentHighlightInput<Anchor, Data> {
  anchor: Anchor;
  data: Data;
}
type GetHighlightClassNamesFunction<Data> = (
  highlightData: Data,
  index: number,
) => string[];
type HighlightManagerEventListenerOptions = {
  resize?: {
    // Whether to update highlights upon resize
    updateHighlights: boolean;
  };
};

/** A class that manages a collection of highlights on a page. */
class HighlightManager<Anchor, Data> {
  private readonly options: MergedHighlightManagerOptions<Anchor, Data>;

  /** A unique ID for this highlight manager. Used to determine if a highlight belongs to this manager. */
  private readonly highlightManagerId: string;
  private readonly highlights: HighlightInternal<Anchor, Data>[] = [];
  private sortedHighlightElements: Array<{
    highlight: HighlightInternal<Anchor, Data>;
    element: HTMLElement;
  }> = [];
  private readonly highlightEventHandlers: Map<
    string,
    Map<HighlightEventName, Set<HighlightEventHandler>>
  > = new Map();

  constructor(options: HighlightManagerOptions<Anchor, Data>) {
    if (!options.container) {
      throw new Error(`container is required.`);
    }

    this.highlightManagerId = uuidv4();
    this.options = {
      container: options.container,
      logger: options.logger ?? console,
      getRangesFromAnchor: options.getRangesFromAnchor,
      isEquivalentHighlight:
        options.isEquivalentHighlight ?? defaultOptions.isEquivalentHighlight,
      getHighlightClassNames:
        options.getHighlightClassNames ?? defaultOptions.getHighlightClassNames,
      highlightClass: options.highlightClass ?? defaultOptions.highlightClass,
      hoverClass: options.hoverClass ?? defaultOptions.hoverClass,
      focusClass: options.focusClass ?? defaultOptions.focusClass,
      eventListeners: merge(
        {},
        defaultOptions.eventListeners,
        options.eventListeners,
      ),
      beforeFocusHighlight: options.beforeFocusHighlight,
    };

    this.addEventListeners();
    this.createMutationObserver();
  }

  /** Notifies the manager that highlights matching the selector must update their classNames. */
  updateHighlightsClassNames(selector: HighlightSelector<Data>) {
    const highlights = this.highlights.filter((h) => selector(h.data));
    if (highlights.length < 1) {
      this.logger().warn(
        `No highlights matched selector to update class names.`,
      );
    }
    return highlights.map((highlight, index) =>
      this.updateHighlightClassNames(highlight, index),
    );
  }

  private updateHighlightClassNames(
    highlight: HighlightInternal<Anchor, Data>,
    index: number,
  ) {
    const newClassNames = this.options.getHighlightClassNames(
      highlight.data,
      index,
    );
    highlight.elements.forEach((element) => {
      highlight.classNames.forEach((className) => {
        element.classList.remove(className);
      });
      newClassNames.forEach((className) => {
        element.classList.add(className);
      });
    });
    highlight.classNames = newClassNames;
    return newClassNames;
  }

  /**
   * Scrolls to the first element of the first highlight matching the selector and
   * applies the focus style to it.
   */
  async focusHighlight(selector: HighlightSelector<Data>) {
    const highlight = this.highlights.find((h) => selector(h.data));
    if (!highlight) {
      this.logger().error(
        `Could not focus highlight for selector ${selector.name} because the highlight wasn't found.`,
      );
      return;
    }

    // Reset styles to their default state
    this.updateStyles();

    try {
      await this.options.beforeFocusHighlight?.(
        this.makeExternalHighlight(highlight),
        () => highlight.elements.length > 0,
      );
    } catch (error) {
      this.logger().warn(
        `Error awaiting beforeFocusHighlight. Proceeding with focus.`,
        error,
      );
    }

    const element = highlight.elements[0];
    if (!element) {
      this.logger().error("Cannot focus highlight because it has no elements.");
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
    this.applyFocusStyle(this.highlights.indexOf(highlight));
  }

  private applyFocusStyle(highlightIndex: number) {
    const highlight = this.highlights[highlightIndex];
    if (!highlight) {
      this.logger().error(
        `Cannot apply focus style because no highlight exists at index ${highlightIndex}`,
      );
      return;
    }
    highlight.elements.forEach((element) => {
      element.classList.add(this.options.focusClass);
    });
  }

  private applyHoverStyle(highlightIndex: number) {
    const highlight = this.highlights[highlightIndex];
    if (!highlight) {
      this.logger().error(
        `Cannot apply hover style because no highlight exists at index ${highlightIndex}`,
      );
      return;
    }
    highlight.elements.forEach((element) => {
      element.classList.add(this.options.hoverClass);
    });
  }

  /**
   * Creates a new highlight. If the anchor produces ranges that are
   * co-extensive with an existing highlight, information for that highlight
   * is returned. Note that this returned object is not guaranteed to be
   * identical to the one that was returned previously, but they will have the
   * same `id`.
   */
  createHighlight(
    anchor: Anchor,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<Anchor, Data> {
    const equivalentHighlight = this.getEquivalentHighlight(anchor, data);
    if (equivalentHighlight) {
      return this.makeExternalHighlight(equivalentHighlight);
    }

    const ranges = this.options.getRangesFromAnchor(anchor);

    const coextensiveHighlight =
      ranges.length && this.getCoextensiveHighlight(ranges);
    if (coextensiveHighlight) {
      return this.makeExternalHighlight(coextensiveHighlight);
    }

    const elements: HTMLElement[] = [];
    const highlight: HighlightInternal<Anchor, Data> = {
      id: uuidv4(),
      data,
      anchor,
      ranges,
      elements,
      onClick: handlers?.onClick,
      classNames: [],
    };

    this.highlights.push(highlight);
    // Must come after adding to highlights for rotation (index-based) coloring.
    highlight.classNames = this.options.getHighlightClassNames(
      highlight.data,
      this.highlights.length - 1,
    );

    const newElements = this.updateHighlightElements(highlight);
    this.options.container.append(...newElements);

    // Allow the elements to be added to the DOM before updating the styles.
    // Otherwise they don't show up until a mousemove event occurs
    setTimeout(() => {
      this.updateStyles();
    });

    return this.makeExternalHighlight(highlight);
  }

  private getEquivalentHighlight(anchor: Anchor, data: Data) {
    return this.highlights.find(
      (h) =>
        deepEqual(h.anchor, anchor) ||
        this.options.isEquivalentHighlight?.(
          { anchor: h.anchor, data: h.data },
          { anchor, data },
        ),
    );
  }

  private getCoextensiveHighlight(
    ranges: Range[],
  ): HighlightInternal<Anchor, Data> | undefined {
    // Check if the new highlight is coextensive with an existing highlight
    // If it is, return the existing highlight
    // Otherwise, return undefined
    return this.highlights.find((highlight) => {
      if (highlight.ranges.length !== ranges.length) {
        return false;
      }
      return highlight.ranges.every((range, index) => {
        const newRange = ranges[index];
        if (!newRange) {
          return false;
        }
        return (
          range.compareBoundaryPoints(Range.START_TO_START, newRange) === 0 &&
          range.compareBoundaryPoints(Range.END_TO_END, newRange) === 0
        );
      });
    });
  }

  private updateStyles() {
    this.sortedHighlightElements.forEach(({ highlight, element }, index) => {
      element.classList.remove(this.options.hoverClass);
      element.classList.remove(this.options.focusClass);

      // Set the z-index so that later highlight elements are on top of earlier highlights.
      element.style.zIndex = (index + 1).toString();

      // Elements immediately adjacent to other elements in the same highlight
      // don't need a left/right border touching the adjacent element.
      const prevElement = highlight.elements[index - 1];
      const nextElement = highlight.elements[index + 1];

      const rect = element.getBoundingClientRect();
      const prevRect = prevElement?.getBoundingClientRect();
      const nextRect = nextElement?.getBoundingClientRect();

      const needsLeftBorder = !prevRect || rect.left - prevRect.right > 1;
      const needsRightBorder = !nextRect || nextRect.left - rect.right > 1;

      if (!needsLeftBorder) {
        element.style.borderLeft = "";
      }
      if (!needsRightBorder) {
        element.style.borderRight = "";
      }
    });
  }

  private addEventListeners() {
    this.options.container.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this),
    );
    this.options.container.addEventListener(
      "click",
      this.handleClick.bind(this),
    );
    if (this.options.eventListeners?.resize?.updateHighlights) {
      this.window().addEventListener(
        "resize",
        throttle(this.handleResize.bind(this), 300),
      );
    }
  }

  private createMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let needsUpdate = false;

      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          if (mutation.addedNodes.length > 0) {
            this.handleAddedNodes();
            needsUpdate = true;
          }
          if (mutation.removedNodes.length > 0) {
            this.handleRemovedNodes();
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        this.updateAllHighlightElements();
      }
    });

    observer.observe(this.options.container, {
      childList: true,
      subtree: true,
    });
  }

  private handleAddedNodes() {
    const unanchoredHighlights = this.highlights.filter((h) =>
      h.ranges.every((r) => r.collapsed),
    );

    for (const highlight of unanchoredHighlights) {
      const newRanges = this.options.getRangesFromAnchor(highlight.anchor);
      if (newRanges.length > 0 && newRanges.every((r) => !r.collapsed)) {
        highlight.ranges = newRanges;
      }
    }
  }

  private handleRemovedNodes() {
    for (const highlight of this.highlights) {
      const invalidRanges = highlight.ranges.filter(
        (range) => !this.isRangeValid(range),
      );

      if (invalidRanges.length > 0) {
        highlight.ranges = this.options.getRangesFromAnchor(highlight.anchor);
      }
    }
  }

  private isRangeValid(range: Range): boolean {
    return (
      this.options.container.contains(range.startContainer) &&
      this.options.container.contains(range.endContainer)
    );
  }

  private insertSortedElement(item: {
    highlight: HighlightInternal<Anchor, Data>;
    element: HTMLElement;
  }) {
    const index = this.sortedHighlightElements.findIndex((existing) => {
      const rect1 = item.element.getBoundingClientRect();
      const rect2 = existing.element.getBoundingClientRect();

      if (rect1.top !== rect2.top) {
        return rect1.top < rect2.top;
      }
      if (rect1.left !== rect2.left) {
        return rect1.left < rect2.left;
      }
      if (rect1.right !== rect2.right) {
        return rect1.right > rect2.right;
      }
      // return whether rect1's highlight ends before rect2's highlight ends
      const range1 = item.highlight.ranges[item.highlight.ranges.length - 1]!;
      const range2 =
        existing.highlight.ranges[existing.highlight.ranges.length - 1]!;
      const comparison = range1.compareBoundaryPoints(Range.END_TO_END, range2);
      if (comparison !== 0) {
        return comparison > 0;
      }
      this.logger().error(
        "Encountered coextensive highlights. This should not happen.",
      );
      return false;
    });

    if (index === -1) {
      this.sortedHighlightElements.push(item);
    } else {
      this.sortedHighlightElements.splice(index, 0, item);
    }
  }

  private removeSortedElement(element: HTMLElement) {
    const index = this.sortedHighlightElements.findIndex(
      (item) => item.element === element,
    );
    if (index > -1) {
      this.sortedHighlightElements.splice(index, 1);
    }
  }

  private handleMouseMove(event: MouseEvent) {
    // Reset all highlights to their default state
    this.updateStyles();

    const highlightElement = this.getHighestHighlightElementAtPoint(
      event.clientX,
      event.clientY,
    );
    const dataset = highlightElement?.dataset;
    if (
      dataset?.["highlightManagerId"] === this.highlightManagerId &&
      dataset?.["highlightIndex"]
    ) {
      const highlightIndex = parseInt(dataset["highlightIndex"]);
      this.applyHoverStyle(highlightIndex);
    }
  }

  private handleClick(event: MouseEvent) {
    // Find the highlight element at the click coordinates
    const highlightElement = this.getHighestHighlightElementAtPoint(
      event.clientX,
      event.clientY,
    );
    if (!highlightElement) {
      return;
    }

    if (
      highlightElement.dataset["highlightManagerId"] !== this.highlightManagerId
    ) {
      return;
    }
    const highlightIndex = highlightElement.dataset["highlightIndex"];
    if (!highlightIndex) {
      this.logger().error(`highlight element was missing a highlight index.`);
      return;
    }

    const index = parseInt(highlightIndex, 10);
    const highlight = this.highlights[index];

    // Check if the click wasn't handled by a child element
    if (
      event.target === highlightElement ||
      !highlightElement.contains(event.target as Node)
    ) {
      if (highlight?.onClick) {
        highlight.onClick(highlight.data);
      }
    }
  }

  protected logger() {
    return this.options.logger;
  }

  protected document() {
    return this.options.container.ownerDocument;
  }

  protected window() {
    const view = this.document().defaultView;
    if (!view) {
      throw new Error(
        "Could not get window because document's defaultView was empty.",
      );
    }
    return view;
  }

  private getHighestHighlightElementAtPoint(
    x: number,
    y: number,
  ): HTMLElement | undefined {
    // elementsFromPoint ignores pointer-events: none, so temporarily enable them
    const highlightElements = this.document().querySelectorAll(
      `.${this.options.highlightClass}`,
    );
    highlightElements.forEach((el) => {
      (el as HTMLElement).style.pointerEvents = "auto";
    });
    // elementsFromPoint returns the elements topmost to bottomost, so the first is the highest
    const highestHighlite = this.document()
      .elementsFromPoint(x, y)
      .find((el) => el.classList.contains(this.options.highlightClass)) as
      | HTMLElement
      | undefined;
    highlightElements.forEach((el) => {
      (el as HTMLElement).style.pointerEvents = "none";
    });
    return highestHighlite;
  }

  private handleResize() {
    this.updateAllHighlightElements();
    this.updateStyles();
  }

  updateAllHighlightElements() {
    const newElements = this.highlights.flatMap((highlight) =>
      this.updateHighlightElements(highlight),
    );
    this.options.container.append(...newElements);
  }

  /**
   * Updates the highlight's elements to have the right coordinates. Adds
   * new elements as necessary, and hides unnecessary ones.
   */
  private updateHighlightElements(highlight: HighlightInternal<Anchor, Data>) {
    const newElements = [] as HTMLElement[];

    let elementIndex = 0;

    if (highlight.ranges.every((r) => r.collapsed)) {
      // If all ranges are collapsed, we need to reanchor the ranges.
      highlight.elements.forEach((element) => {
        element.remove();
        this.removeSortedElement(element);
      });
      highlight.elements = [];
      highlight.ranges = this.options.getRangesFromAnchor(highlight.anchor);
    }

    highlight.ranges.forEach((range) => {
      const rangeRects = Array.from(range.getClientRects());
      const combinedRects = combineRects(rangeRects);

      combinedRects.forEach((rect) => {
        let element = highlight.elements[elementIndex];
        if (!element) {
          element = this.createElementForHighlight(highlight);
          newElements.push(element);
        }

        const left = rect.left + this.window().scrollX;
        const top = rect.top + this.window().scrollY;
        const width = rect.width;
        const height = rect.height;

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        element.style.display = "block";

        elementIndex++;
      });
    });

    // Hide any extra elements
    for (let i = elementIndex; i < highlight.elements.length; i++) {
      highlight.elements[i]!.style.display = "none";
    }

    // Allow the elements rects to update before sorting them
    setTimeout(() => {
      highlight.elements.forEach((element) => {
        this.removeSortedElement(element);
        if (element.style.display !== "none") {
          this.insertSortedElement({ highlight, element });
        }
      });
    });

    if (newElements.length) {
      this.highlightEventHandlers
        .get(highlight.id)
        ?.get("newelements")
        ?.forEach((handler) => {
          handler();
        });
    }

    return newElements;
  }

  private createElementForHighlight(
    highlight: HighlightInternal<Anchor, Data>,
  ): HTMLElement {
    const element = this.document().createElement("div");
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
    element.style.mixBlendMode = "multiply"; // This helps with color blending

    element.classList.add(this.options.highlightClass);
    highlight.classNames.forEach((className) => {
      element.classList.add(className);
    });

    element.dataset["highlightManagerId"] = this.highlightManagerId;
    element.dataset["highlightIndex"] = this.highlights
      .indexOf(highlight)
      .toString();
    highlight.elements.push(element);
    return element;
  }

  /** Remove the highlight matching `highlight.id`. */
  removeHighlight(highlight: Pick<Highlight<Anchor, Data>, "id">) {
    const index = this.highlights.findIndex((h) => h.id === highlight.id);
    if (index < 0) {
      return;
    }

    const [removedHighlight] = this.highlights.splice(index, 1);
    removedHighlight?.elements.forEach((element) => {
      element.remove();
      this.removeSortedElement(element);
    });
    this.updateStyles();
  }

  /** Remove highlights matching the selector. */
  removeHighlights(selector: HighlightSelector<Data>) {
    const highlights = this.highlights.filter((h) => selector(h.data));
    for (const highlight of highlights) {
      this.removeHighlight(highlight);
    }
  }

  /** Remove all highlights. */
  removeAllHighlights() {
    this.highlights.forEach((highlight) => {
      highlight.elements.forEach((element) => element.remove());
    });
    this.highlights.splice(0, this.highlights.length);
    this.sortedHighlightElements = [];
  }

  /** For testing: returns an array of the highlight's elements' bounding client rects. */
  getElementBoundingClientRects({ id }: Highlight<Anchor, Data>) {
    const internal = this.highlights.find((h) => h.id === id);
    if (!internal) {
      throw new Error("Highlight was not found.");
    }
    return internal.elements.map((e) => e.getBoundingClientRect());
  }

  getElementClientRects({ id }: Highlight<Anchor, Data>) {
    const internal = this.highlights.find((h) => h.id === id);
    if (!internal) {
      throw new Error("Highlight was not found.");
    }
    return internal.elements.flatMap((e) => Array.from(e.getClientRects()));
  }

  private makeExternalHighlight(
    highlight: HighlightInternal<Anchor, Data>,
  ): Highlight<Anchor, Data> {
    const { id, anchor, classNames, data } = highlight;
    return {
      id,
      anchor,
      classNames,
      data,
      hasElements: () => highlight.elements.length > 0,
      on: (event, handler) => {
        this.addHighlightEventListener(highlight, event, handler);
      },
      off: (event, handler) => {
        this.removeHighlightEventListener(highlight, event, handler);
      },
    };
  }

  private addHighlightEventListener(
    highlight: HighlightInternal<Anchor, Data>,
    event: HighlightEventName,
    handler: HighlightEventHandler,
  ) {
    let highlightHandlers = this.highlightEventHandlers.get(highlight.id);
    if (!highlightHandlers) {
      highlightHandlers = new Map();
      this.highlightEventHandlers.set(highlight.id, highlightHandlers);
    }
    let eventHandlers = highlightHandlers.get(event);
    if (!eventHandlers) {
      eventHandlers = new Set();
      highlightHandlers.set(event, eventHandlers);
    }
    eventHandlers.add(handler);
  }

  private removeHighlightEventListener(
    highlight: HighlightInternal<Anchor, Data>,
    event: HighlightEventName,
    handler: HighlightEventHandler,
  ) {
    this.highlightEventHandlers.get(highlight.id)?.get(event)?.delete(handler);
  }
}

export type HighlightEventName = "newelements";
export type HighlightEventHandler = () => void;

export interface HighlightHandlers<Data> {
  onClick: (highlightData: Data) => void;
}

export { HighlightManager };

/**
 * The data stored with a highlight. Users must never access or modify this data directly. The manager
 * provides access to the data via callbacks.
 */
interface HighlightInternal<Anchor, Data> {
  /** A unique identifier for the highlight. */
  id: string;
  /** The object that anchors the highlight to the document */
  anchor: Anchor;
  /** Arbitrary data to associate with the highlight. Can be used to identify the highlight via callbacks. */
  data: Data;
  /** The highlight's ranges. */
  ranges: Range[];
  /** The highlight's elemens. */
  elements: HTMLElement[];
  /** The onClick handler. */
  onClick?: (highlightData: Data) => void;
  /** The class names applied to the highlight. */
  classNames: string[];
}

/** A datatype exposing readonly Highlight information. */
export interface Highlight<Anchor, Data> {
  /** A unique identifier for the highlight. */
  readonly id: string;
  /** The object that anchors the highlight to the document */
  readonly anchor: Readonly<Anchor>;
  /** Arbitrary data to associate with the highlight. Can be used to identify the highlight via callbacks. */
  readonly data: Readonly<Data>;
  /** The class names applied to the highlight. */
  readonly classNames: ReadonlyArray<string>;
  /** Returns true if the highlight has elements and false otherwise.*/
  readonly hasElements: () => boolean;
  readonly on: (
    event: HighlightEventName,
    handler: HighlightEventHandler,
  ) => void;
  readonly off: (
    event: HighlightEventName,
    handler: HighlightEventHandler,
  ) => void;
}

type MergedHighlightManagerOptions<Anchor, Data> = {
  container: HTMLElement;
  getRangesFromAnchor: GetRangesFromAnchorFunction<Anchor>;
  isEquivalentHighlight?: IsEquivalentHighlightFunction<Anchor, Data>;
  getHighlightClassNames: GetHighlightClassNamesFunction<Data>;
  highlightClass: string;
  hoverClass: string;
  focusClass: string;
  logger: Logger;
  eventListeners?: HighlightManagerEventListenerOptions;
  beforeFocusHighlight?: (
    highlight: Highlight<Anchor, Data>,
    highlightHasElements: () => boolean,
  ) => Promise<void>;
};

export const classNameIndexPlaceholder = "{index}";
const defaultRotationColorCount = 5;
const defaultOptions = {
  isEquivalentHighlight: (
    {
      anchor: anchor1,
      data: data1,
    }: EquivalentHighlightInput<unknown, unknown>,
    {
      anchor: anchor2,
      data: data2,
    }: EquivalentHighlightInput<unknown, unknown>,
  ) => deepEqual(anchor1, anchor2) || deepEqual(data1, data2),
  getHighlightClassNames: (_highlightData: unknown, index: number) => [
    `highlight-color-${index % defaultRotationColorCount}`,
  ],
  highlightClass: "highlight",
  hoverClass: "highlight-hover",
  focusClass: "highlight-focus",
  eventListeners: {
    resize: {
      updateHighlights: true,
    },
  },
};

type HighlightSelector<Data> = (highlightData: Data) => boolean;
