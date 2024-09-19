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
  private highlights: Highlight[] = [];
  private container: HTMLElement;
  private colors = defaultColors;
  private resizeHandler: () => void;
  private dragDetector: DragDetector;

  constructor(container: HTMLElement) {
    this.container = container;
    this.resizeHandler = this.handleResize.bind(this);
    window.addEventListener("resize", this.resizeHandler);
    this.dragDetector = new DragDetector(
      container,
      this.handleDragStart.bind(this),
      this.handleDragEnd.bind(this)
    );
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
    this.container.append(...newElements);

    this.updateStyles();
    this.addEventListeners();

    return highlight;
  }

  private updateStyles() {
    const inOrderHighlightElements = this.highlights
      .flatMap((highlight, highlightIndex) =>
        highlight.elements.map((element) => ({
          highlight,
          element,
          highlightIndex,
        }))
      )
      // TODO maintain sorted order instead of recalculating it each time
      .sort(({ element: e1 }, { element: e2 }) => {
        switch (e1.compareDocumentPosition(e2)) {
          case Node.DOCUMENT_POSITION_PRECEDING:
          case Node.DOCUMENT_POSITION_CONTAINS:
            return 1;
          case Node.DOCUMENT_POSITION_FOLLOWING:
          case Node.DOCUMENT_POSITION_CONTAINED_BY:
            return -1;
          case Node.DOCUMENT_POSITION_DISCONNECTED:
          case Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC:
          // error?
          default:
            return 0;
        }
      });
    inOrderHighlightElements.forEach(
      ({ highlight, element, highlightIndex }, index) => {
        const color = this.colors[highlightIndex % this.colors.length];

        element.style.backgroundColor = color.bg;
        element.style.border = `1px solid ${color.border}`;
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
      }
    );
  }

  private addEventListeners() {
    this.container.addEventListener(
      "mouseover",
      this.handleMouseOver.bind(this)
    );
    this.container.addEventListener("mouseout", this.handleMouseOut.bind(this));
    this.container.addEventListener("click", this.handleClick.bind(this));
  }

  private handleMouseOver(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const highlightIndex = target.dataset.highlightIndex;
    if (highlightIndex) {
      const index = parseInt(highlightIndex, 10);
      const color = this.colors[index % this.colors.length];
      this.highlights[index].elements.forEach((element) => {
        element.style.backgroundColor = color.hover;
        element.style.borderColor = color.hover;
      });
    }
  }

  private handleMouseOut(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const highlightIndex = target.dataset.highlightIndex;
    if (highlightIndex) {
      this.updateStyles();
    }
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const highlightIndex = target.dataset.highlightIndex;
    if (highlightIndex) {
      const index = parseInt(highlightIndex, 10);
      const highlight = this.highlights[index];
      if (highlight.onClick) {
        highlight.onClick(highlight);
      }
    }
  }

  private handleResize() {
    this.updateHighlightPositions();
  }

  private updateHighlightPositions() {
    const newElements = this.highlights.flatMap((highlight) => {
      return this.updateHighlightElements(highlight);
    });
    this.container.append(...newElements);
  }

  private updateHighlightElements(highlight: Highlight) {
    const newElements = [] as HTMLElement[];

    let elementIndex = 0;

    highlight.ranges.forEach((range) => {
      const rects = Array.from(range.getClientRects());
      const uniqueRects = this.filterUniqueRects(rects);

      uniqueRects.forEach((rect) => {
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

    return newElements;
  }

  private createElementForHighlight(highlight: Highlight): HTMLElement {
    const element = document.createElement("div");
    element.classList.add("sophistree-highlight");
    element.style.position = "absolute";
    // TODO how can we click highlighted links? I think we must provide a context
    // menu item or a hover item.
    element.style.pointerEvents = highlight.onClick ? "auto" : "none";
    element.dataset.highlightIndex = (this.highlights.length - 1).toString();
    highlight.elements.push(element);
    return element;
  }

  private filterUniqueRects(rects: DOMRect[]): DOMRect[] {
    return rects.reduce((uniqueRects: DOMRect[], currentRect: DOMRect) => {
      const isEncompassed = uniqueRects.some((uniqueRect) =>
        this.isRectEncompassed(currentRect, uniqueRect)
      );

      if (!isEncompassed) {
        uniqueRects.push(currentRect);
      }

      return uniqueRects;
    }, []);
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
    if (index > -1) {
      this.highlights.splice(index, 1);
      highlight.elements.forEach((element) => element.remove());
      this.updateStyles();
    }
  }

  removeAllHighlights() {
    this.highlights.forEach((highlight) => {
      highlight.elements.forEach((element) => element.remove());
    });
    this.highlights = [];
    window.removeEventListener("resize", this.resizeHandler);
    this.dragDetector.destroy();
  }

  private handleDragStart() {
    this.setHighlightPointerEvents("none");
  }

  private handleDragEnd() {
    this.setHighlightPointerEvents("auto");
  }

  private setHighlightPointerEvents(value: "none" | "auto") {
    this.highlights.forEach((highlight) => {
      highlight.elements.forEach((element) => {
        element.style.pointerEvents = value;
      });
    });
  }
}

export { HighlightManager };
export type { Highlight };
