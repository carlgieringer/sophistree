import debounce from "lodash.debounce";
import { v4 as uuidv4 } from "uuid";

interface Highlight<Anchor, Data> {
  /** The object that anchors the highlight to the document */
  anchor: Anchor;
  /** Arbitrary data to associate with the highlight. Can be used to activate the highlight later. */
  data: Data;
  ranges: Range[];
  elements: HTMLElement[];
  onClick?: (highlight: Highlight<Anchor, Data>) => void;
  /** The color class applied to the highlight, if any. */
  colorClass?: string;
}

export type Logger = Pick<typeof console, "error" | "warn">;

type GetRangesFromAnchorFunction<Anchor> = (anchor: Anchor) => Range[];

export type HighlightManagerOptions<Anchor, Data> = {
  container: HTMLElement;
  getRangesFromAnchor: GetRangesFromAnchorFunction<Anchor>;
  highlightClass?: string;
  colors:
    | {
        mode: "rotate";
        count: number;
        colorIndexClassFormat?: string;
      }
    | {
        mode: "class-callback";
        getColorClass: (data: Data) => string;
      };
  hoverClass?: string;
  logger?: Logger;
};
type MergedHighlightManagerOptions<Anchor, Data> = {
  container: HTMLElement;
  logger: Logger;
  getRangesFromAnchor: GetRangesFromAnchorFunction<Anchor>;
  highlightClass: string;
  colors:
    | {
        mode: "rotate";
        count: number;
        colorIndexClassFormat: string;
      }
    | {
        mode: "class-callback";
        getColorClass: (data: Data) => string;
      };
  hoverClass: string;
};

export const classNameIndexPlaceholder = "{index}";
const defaultOptions = {
  highlightClass: "highlight",
  colors: {
    mode: "rotate",
    colorIndexClassFormat: `highlight-color-${classNameIndexPlaceholder}`,
  },
  hoverClass: "highlight-hover",
};

type ColorsOptions<Anchor, Data> = HighlightManagerOptions<
  Anchor,
  Data
>["colors"];
type MergedColorsOptions<Anchor, Data> = MergedHighlightManagerOptions<
  Anchor,
  Data
>["colors"];

type HighlightSelector<Anchor, Data> = (
  highlight: Highlight<Anchor, Data>,
) => boolean;

class HighlightManager<Anchor, Data> {
  private readonly options: MergedHighlightManagerOptions<Anchor, Data>;

  /** A unique ID for this highlight manager. Used to determine if a highlight belongs to this manager. */
  private readonly highlightManagerId: string;
  private readonly highlights: Highlight<Anchor, Data>[] = [];
  private sortedHighlightElements: Array<{
    highlight: Highlight<Anchor, Data>;
    element: HTMLElement;
  }> = [];

  constructor(options: HighlightManagerOptions<Anchor, Data>) {
    this.highlightManagerId = uuidv4();
    this.options = {
      container: options.container,
      logger: options.logger ?? console,
      getRangesFromAnchor: options.getRangesFromAnchor,
      highlightClass: options.highlightClass ?? defaultOptions.highlightClass,
      colors: this.mergeColors(options.colors),
      hoverClass: options.hoverClass ?? defaultOptions.hoverClass,
    };

    this.addEventListeners();
  }

  private mergeColors(
    colors: ColorsOptions<Anchor, Data>,
  ): MergedColorsOptions<Anchor, Data> {
    switch (colors.mode) {
      case "rotate":
        return {
          mode: colors.mode,
          colorIndexClassFormat:
            colors.colorIndexClassFormat ??
            defaultOptions.colors.colorIndexClassFormat,
          count: colors.count,
        };
      case "class-callback":
        return colors;
    }
  }

  updateHighlightsColorClass(selector: HighlightSelector<Anchor, Data>) {
    const highlights = this.highlights.filter(selector);
    if (highlights.length < 1) {
      this.options.logger.error(
        `Could not update highlights color class for selector ${selector.name} because no highlights matched.`,
      );
      return;
    }
    highlights.forEach((highlight) => {
      this.updateHighlightColorClass(highlight);
    });
  }

  private updateHighlightColorClass(highlight: Highlight<Anchor, Data>) {
    const newColorClass = this.getColorClass(highlight);
    highlight.elements.forEach((element) => {
      if (highlight.colorClass) {
        element.classList.remove(highlight.colorClass);
      }
      element.classList.add(newColorClass);
    });
    highlight.colorClass = newColorClass;
  }

  private getColorClass(highlight: Highlight<Anchor, Data>) {
    switch (this.options.colors.mode) {
      case "rotate": {
        const highlightColorIndex =
          this.highlights.indexOf(highlight) % this.options.colors.count;

        return this.options.colors.colorIndexClassFormat.replace(
          classNameIndexPlaceholder,
          highlightColorIndex.toString(),
        );
      }
      case "class-callback": {
        return this.options.colors.getColorClass(highlight.data);
      }
    }
  }

  focusHighlight(selector: HighlightSelector<Anchor, Data>) {
    const highlight = this.highlights.find(selector);
    if (!highlight) {
      this.options.logger.error(
        `Could not activate highlight for selector ${selector.name} because the highlight wasn't found.`,
      );
      return;
    }

    // Reset styles to their default state
    this.updateStyles();

    highlight.elements[0].scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
    this.applyHoverStyle(this.highlights.indexOf(highlight));
  }

  private applyHoverStyle(highlightIndex: number) {
    const highlight = this.highlights[highlightIndex];
    highlight.elements.forEach((element) => {
      element.classList.add(this.options.hoverClass);
    });
  }

  createHighlight(
    anchor: Anchor,
    data: Data,
    handlers?: {
      onClick: (highlight: Highlight<Anchor, Data>) => void;
    },
  ): Highlight<Anchor, Data> {
    const ranges = this.options.getRangesFromAnchor(anchor);
    const coextensiveHighlight = this.getCoextensiveHighlight(ranges);
    if (coextensiveHighlight) {
      return coextensiveHighlight;
    }

    const elements: HTMLElement[] = [];
    const highlight: Highlight<Anchor, Data> = {
      data,
      anchor,
      ranges,
      elements,
      onClick: handlers?.onClick,
    };

    this.highlights.push(highlight);
    // Must come after adding to highlights for rotation (index-based) coloring.
    highlight.colorClass = this.getColorClass(highlight);

    const newElements = this.updateHighlightElements(highlight);
    this.options.container.append(...newElements);

    // Allow the elements to be added to the DOM before updating the styles.
    // Otherwise they don't show up until a mousemove event occurs
    setTimeout(() => {
      this.updateStyles();
    });

    return highlight;
  }

  private getCoextensiveHighlight(
    ranges: Range[],
  ): Highlight<Anchor, Data> | undefined {
    // Check if the new highlight is coextensive with an existing highlight
    // If it is, return the existing highlight
    // Otherwise, return undefined
    return this.highlights.find((highlight) => {
      if (highlight.ranges.length !== ranges.length) {
        return false;
      }
      return highlight.ranges.every((range, index) => {
        const newRange = ranges[index];
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
    window.addEventListener(
      "resize",
      debounce(this.handleResize.bind(this), 300),
    );
  }

  private insertSortedElement(item: {
    highlight: Highlight<Anchor, Data>;
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
      const range1 = item.highlight.ranges[item.highlight.ranges.length - 1];
      const range2 =
        existing.highlight.ranges[existing.highlight.ranges.length - 1];
      const comparison = range1.compareBoundaryPoints(Range.END_TO_END, range2);
      if (comparison !== 0) {
        return comparison > 0;
      }
      this.options.logger.error(
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
      dataset?.highlightManagerId === this.highlightManagerId &&
      dataset?.highlightIndex
    ) {
      const highlightIndex = parseInt(dataset.highlightIndex);
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

    if (highlightElement.dataset.highlightManagerId !== this.highlightManagerId) {
      return;
    }
    const highlightIndex = highlightElement.dataset.highlightIndex;
    if (!highlightIndex) {
      this.options.logger.error(`highlight element was missing a highlight index.`)
      return;
    }

    const index = parseInt(highlightIndex, 10);
    const highlight = this.highlights[index];

    // Check if the click wasn't handled by a child element
    if (
      event.target === highlightElement ||
      !highlightElement.contains(event.target as Node)
    ) {
      if (highlight.onClick) {
        highlight.onClick(highlight);
      }
    }
  }

  private getHighestHighlightElementAtPoint(
    x: number,
    y: number,
  ): HTMLElement | undefined {
    // elementsFromPoint ignores pointer-events: none, so temporarily enable them
    const highlightElements = document.querySelectorAll(
      `.${this.options.highlightClass}`,
    );
    highlightElements.forEach((el) => {
      (el as HTMLElement).style.pointerEvents = "auto";
    });
    // elementsFromPoint returns the elements topmost to bottomost, so the first is the highest
    const highestHighlite = document
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

  private updateAllHighlightElements() {
    const newElements = this.highlights.flatMap((highlight) =>
      this.updateHighlightElements(highlight),
    );
    this.options.container.append(...newElements);
  }

  /**
   * Updates the highlight's elements to have the right coordinates. Adds
   * new elements as necessary, and hides unnecessary ones.
   */
  private updateHighlightElements(highlight: Highlight<Anchor, Data>) {
    const newElements = [] as HTMLElement[];

    let elementIndex = 0;

    if (highlight.ranges.every((r) => r.collapsed)) {
      // If all ranges are collapsed, we need to recreate the ranges.
      highlight.elements.forEach((element) => {
        element.remove();
        this.removeSortedElement(element);
      });
      highlight.elements = [];
      highlight.ranges = this.options.getRangesFromAnchor(highlight.anchor);
    }

    highlight.ranges.forEach((range) => {
      const rangeRects = Array.from(range.getClientRects());
      const combinedRects = this.combineAdjacentRects(rangeRects);

      combinedRects.forEach((rect) => {
        let element = highlight.elements[elementIndex];
        if (!element) {
          element = this.createElementForHighlight(highlight);
          newElements.push(element);
        }

        const left = rect.left + window.scrollX;
        const top = rect.top + window.scrollY;
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
      highlight.elements[i].style.display = "none";
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

    return newElements;
  }

  private createElementForHighlight(
    highlight: Highlight<Anchor, Data>,
  ): HTMLElement {
    const element = document.createElement("div");
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
    element.style.mixBlendMode = "multiply"; // This helps with color blending

    element.classList.add(this.options.highlightClass);
    if (highlight.colorClass) {
      element.classList.add(highlight.colorClass);
    }

    element.dataset.highlightManagerId = this.highlightManagerId;
    element.dataset.highlightIndex = this.highlights
      .indexOf(highlight)
      .toString();
    highlight.elements.push(element);
    return element;
  }

  private combineAdjacentRects(rects: DOMRect[]): DOMRect[] {
    if (rects.length === 0) return [];

    // Sort rects by top, then left
    const sortedRects = rects.sort((a, b) =>
      a.top !== b.top ? a.top - b.top : a.left - b.left,
    );

    const combinedRects: DOMRect[] = [];
    let currentRect = sortedRects[0];

    for (let i = 1; i < sortedRects.length; i++) {
      const nextRect = sortedRects[i];

      // If the rects have the same top and height and are adjacent or overlapping
      if (
        currentRect.top === nextRect.top &&
        currentRect.height === nextRect.height &&
        nextRect.left <= currentRect.right + 1
      ) {
        // Combine the rects
        currentRect = new DOMRect(
          currentRect.left,
          currentRect.top,
          Math.max(nextRect.right - currentRect.left, currentRect.width),
          currentRect.height,
        );
      } else {
        // If they're not combinable, add the current rect to the result and move to the next
        combinedRects.push(currentRect);
        currentRect = nextRect;
      }
    }

    // Add the last rect
    combinedRects.push(currentRect);

    return combinedRects;
  }

  removeHighlight(highlight: Highlight<Anchor, Data>) {
    const index = this.highlights.indexOf(highlight);
    if (index < 0) {
      return;
    }
    this.highlights.splice(index, 1);
    highlight.elements.forEach((element) => {
      element.remove();
      this.removeSortedElement(element);
    });
    this.updateStyles();
  }

  removeAllHighlights() {
    this.highlights.forEach((highlight) => {
      highlight.elements.forEach((element) => element.remove());
    });
    this.highlights.splice(0, this.highlights.length);
    this.sortedHighlightElements = [];
  }
}

export { HighlightManager };
export type { Highlight };
