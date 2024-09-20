import { DragDetector } from "./DragDetector";

interface Highlight {
  ranges: Range[];
  elements: HTMLElement[];
  onClick?: (highlight: Highlight) => void;
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

class HighlightManager {
  private container: HTMLElement;
  private highlights: Highlight[] = [];
  private sortedHighlightElements: Array<{
    highlight: Highlight;
    element: HTMLElement;
  }> = [];
  private colors = defaultColors;

  constructor(container: HTMLElement) {
    this.container = container;
    this.addEventListeners();
  }

  createHighlight(
    ranges: Range[],
    handlers?: {
      onClick: (highlight: Highlight) => void;
    }
  ): Highlight {
    const elements: HTMLElement[] = [];
    const highlight: Highlight = {
      ranges,
      elements,
      onClick: handlers?.onClick,
    };

    this.highlights.push(highlight);

    const newElements = this.updateHighlightElements(highlight);
    console.log(this.sortedHighlightElements.map((e) => e.element));
    this.container.append(...newElements);

    this.updateStyles();

    return highlight;
  }

  private updateStyles() {
    this.sortedHighlightElements.forEach(({ highlight, element }, index) => {
      const highlightIndex = this.highlights.indexOf(highlight);
      const color = this.colors[highlightIndex % this.colors.length];

      element.style.backgroundColor = color.bg;
      element.style.border = `1px solid ${color.border}`;
      // Set the z-index so that later highlight elements are on top of earlier highlights.
      element.style.zIndex = (index + 1).toString();
      element.style.cursor = highlight.onClick ? "pointer" : "default";
      element.style.mixBlendMode = "multiply"; // This helps with color blending

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
    window.addEventListener("resize", this.handleResize.bind(this));
  }

  private insertSortedElement(item: {
    highlight: Highlight;
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
      return rect2.right > rect1.right;
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
      const highlight = this.highlights[highlightIndex];
      const color = this.colors[highlightIndex % this.colors.length];

      highlight.elements.forEach((element) => {
        element.style.backgroundColor = color.hover;
        element.style.borderColor = color.hover;
      });
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
  private updateHighlightElements(highlight: Highlight) {
    const newElements = [] as HTMLElement[];

    let elementIndex = 0;

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

  private createElementForHighlight(highlight: Highlight): HTMLElement {
    const element = document.createElement("div");
    element.classList.add("sophistree-highlight");
    element.style.position = "absolute";
    element.style.pointerEvents = "none";
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

  removeHighlight(highlight: Highlight) {
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
