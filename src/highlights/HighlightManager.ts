import debounce from "lodash.debounce";

interface Highlight<Anchor, Data> {
  /** The object that anchors the highlight to the document */
  anchor: Anchor;
  /** Arbitrary data to associate with the highlight. Can be used to activate the highlight later. */
  data: Data;
  ranges: Range[];
  elements: HTMLElement[];
  onClick?: (highlight: Highlight<Anchor, Data>) => void;
}

const defaultColors = [
  {
    // Light yellow
    bg: "rgba(255, 245, 180, 0.4)",
    border: "rgba(255, 218, 151, 0.6)",
    hover: "rgba(255, 215, 0, 0.5)",
  },
  {
    // Light pink
    bg: "rgba(255, 228, 225, 0.3)",
    border: "rgba(255, 160, 122, 0.5)",
    hover: "rgba(250, 128, 114, 0.5)",
  },
  {
    // Light purple
    bg: "rgba(230, 230, 250, 0.3)",
    border: "rgba(216, 191, 216, 0.5)",
    hover: "rgba(221, 160, 221, 0.5)",
  },
  {
    // Light green
    bg: "rgba(220, 245, 220, 0.4)",
    border: "rgba(132, 231, 132, 0.6)",
    hover: "rgba(144, 238, 144, 0.5)",
  },
  {
    // Light blue
    bg: "rgba(240, 248, 255, 0.3)",
    border: "rgba(135, 206, 250, 0.5)",
    hover: "rgba(30, 144, 255, 0.5)",
  },
];

type GetRangesFromAnchorFunction<Anchor> = (
  container: HTMLElement,
  anchor: Anchor
) => Range[];

class HighlightManager<Anchor, Data> {
  private highlights: Highlight<Anchor, Data>[] = [];
  private sortedHighlightElements: Array<{
    highlight: Highlight<Anchor, Data>;
    element: HTMLElement;
  }> = [];
  private colors = defaultColors;
  private colorTransitionDuration = "0.3s";

  constructor(
    private readonly container: HTMLElement,
    private readonly getRangesFromAnchor: GetRangesFromAnchorFunction<Anchor>
  ) {
    this.container = container;
    this.getRangesFromAnchor = getRangesFromAnchor;
    this.addEventListeners();
  }

  activateHighlight(selector: (highlight: Highlight<Anchor, Data>) => boolean) {
    const highlight = this.highlights.find(selector);
    if (!highlight) {
      console.error(
        `Could not activate highlight for selector ${selector} because the highlight wasn't found.`
      );
      return;
    }

    highlight.elements[0].scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
    this.applyHoverStyle(this.highlights.indexOf(highlight));
  }

  private applyHoverStyle(highlightIndex: number) {
    const highlight = this.highlights[highlightIndex];
    const color = this.getHighlightColor(highlightIndex);

    highlight.elements.forEach((element) => {
      element.style.backgroundColor = color.hover;
      element.style.borderColor = color.hover;
    });
  }

  createHighlight(
    anchor: Anchor,
    data: Data,
    handlers?: {
      onClick: (highlight: Highlight<Anchor, Data>) => void;
    }
  ): Highlight<Anchor, Data> {
    const ranges = this.getRangesFromAnchor(this.container, anchor);
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

    const newElements = this.updateHighlightElements(highlight);
    console.log(this.sortedHighlightElements.map((e) => e.element));
    this.container.append(...newElements);

    // Allow the elements to be added to the DOM before updating the styles.
    // Otherwise they don't show up until a mousemove event occurs
    setTimeout(() => {
      this.updateStyles();
    });

    return highlight;
  }

  private getCoextensiveHighlight(
    ranges: Range[]
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

  private getHighlightColor(highlight: Highlight<Anchor, Data> | number) {
    const highlightIndex =
      typeof highlight === "number"
        ? highlight
        : this.highlights.indexOf(highlight);
    return this.colors[highlightIndex % this.colors.length];
  }

  private updateStyles() {
    this.sortedHighlightElements.forEach(({ highlight, element }, index) => {
      const color = this.getHighlightColor(highlight);

      element.style.backgroundColor = color.bg;
      element.style.borderColor = color.border;
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
    this.container.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this)
    );
    this.container.addEventListener("click", this.handleClick.bind(this));
    window.addEventListener(
      "resize",
      debounce(this.handleResize.bind(this), 300)
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
      console.error(
        "Encountered coextensive highlights. This should not happen."
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
      (item) => item.element === element
    );
    if (index > -1) {
      this.sortedHighlightElements.splice(index, 1);
    }
  }

  private handleMouseMove(event: MouseEvent) {
    const highlightElement = this.getHighestHighlightElementAtPoint(
      event.clientX,
      event.clientY
    );

    // Reset all highlights to their default state
    this.updateStyles();

    if (highlightElement && highlightElement.dataset.highlightIndex) {
      const highlightIndex = parseInt(highlightElement.dataset.highlightIndex);
      this.applyHoverStyle(highlightIndex);
    }
  }

  private handleClick(event: MouseEvent) {
    // Find the highlight element at the click coordinates
    const highlightElement = this.getHighestHighlightElementAtPoint(
      event.clientX,
      event.clientY
    );

    if (!highlightElement) {
      return;
    }
    const highlightIndex = highlightElement.dataset.highlightIndex;
    if (!highlightIndex) {
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
    y: number
  ): HTMLElement | undefined {
    // elementsFromPoint ignores pointer-events: none, so temporarily enable them
    const highlightElements = document.querySelectorAll(
      ".sophistree-highlight"
    );
    highlightElements.forEach((el) => {
      (el as HTMLElement).style.pointerEvents = "auto";
    });
    // elementsFromPoint returns the elements topmost to bottomost, so the first is the highest
    const highestHighlite = document
      .elementsFromPoint(x, y)
      .find((el) => el.classList.contains("sophistree-highlight")) as
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
      this.updateHighlightElements(highlight)
    );
    this.container.append(...newElements);
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
      highlight.ranges = this.getRangesFromAnchor(
        this.container,
        highlight.anchor
      );
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
    highlight: Highlight<Anchor, Data>
  ): HTMLElement {
    const element = document.createElement("div");
    element.classList.add("sophistree-highlight");
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
    element.style.transition = `background-color ${this.colorTransitionDuration} ease, border-color ${this.colorTransitionDuration} ease`;
    element.style.borderWidth = "1px";
    element.style.borderStyle = "solid";
    element.style.cursor = highlight.onClick ? "pointer" : "default";
    element.style.mixBlendMode = "multiply"; // This helps with color blending
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
      a.top !== b.top ? a.top - b.top : a.left - b.left
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
          currentRect.height
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

  private isRectEncompassed(rect1: DOMRect, rect2: DOMRect): boolean {
    return (
      rect1.left >= rect2.left &&
      rect1.right <= rect2.right &&
      rect1.top >= rect2.top &&
      rect1.bottom <= rect2.bottom
    );
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
    this.highlights = [];
    this.sortedHighlightElements = [];
  }
}

export { HighlightManager };
export type { Highlight };
