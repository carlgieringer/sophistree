import { test, expect, type Page } from "@playwright/test";
import * as textQuote from "dom-anchor-text-quote";

import { HighlightManager, Highlight } from "../src/HighlightManager";

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test.describe("HighlightManager", () => {
  test.beforeEach(async () => {
    await page.goto("about:blank");
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .highlight { position: absolute; pointer-events: none; }
            .highlight-color-0 { background-color: aqua; opacity: 50%; }
            .highlight-color-1 { background-color: fuchsia;  opacity: 50%; }
            .highlight-color-2 { background-color: lime;  opacity: 50%; }
            .highlight-hover { outline: 2px solid red; }
            .highlight-focus { outline: 2px solid yellow; }
          </style>
        </head>
        <body>
          <p>This is some sample text that we will use for our <a href="localhost">highlighting tests</a>.</p>
          <script type="module" src="http://localhost:3000/windowWrapper.js"></script>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      const container = document.body;

      const getRangesFromAnchor = (
        textQuoteAnchor: textQuote.TextQuoteAnchor,
      ) => {
        const range = window.textQuoteToRange(container, textQuoteAnchor);
        return range ? [range] : [];
      };

      window.manager = new window.HighlightManager({
        container,
        getRangesFromAnchor,
        getHighlightClassNames: (data, index) => [
          `highlight-color-${index % 3}`,
        ],
      });
    });
  });

  test("should create a highlight", async () => {
    const highlightCount = await page.evaluate(() => {
      window.manager.createHighlight({ exact: "This is some" }, { id: 1 });
      return document.querySelectorAll(".highlight").length;
    });
    expect(highlightCount).toBe(1);
  });

  test("should remove a highlight", async () => {
    const highlightCount = await page.evaluate(() => {
      const highlight = window.manager.createHighlight(
        { exact: "This is some" },
        { id: 1 },
      );
      window.manager.removeHighlight(highlight);
      return document.querySelectorAll(".highlight").length;
    });
    expect(highlightCount).toBe(0);
  });

  test("should handle overlapping highlights correctly", async () => {
    const [{ x, y }] = await page.evaluate(() => {
      window.manager.createHighlight(
        { exact: "This is some sample text" },
        {
          id: 1,
        },
      );
      const highlight2 = window.manager.createHighlight(
        { exact: "sample text that we will use" },
        {
          id: 2,
        },
      );
      window.manager.createHighlight(
        { exact: "that we will use for our" },
        {
          id: 3,
        },
      );
      return window.manager.getElementBoundingClientRects(highlight2);
    });
    if (!rect) {
      throw new Error("Failed to get rect");
    }
    const { x, y } = rect;

    // Simulate mousemove just within highlight2
    await page.mouse.move(x + 1, y + 1);

    const { hoveredElementCount, hoverHighlightIndex } = await page.evaluate(
      () => {
        const hoveredElements = document.querySelectorAll(".highlight-hover");
        const hoveredElementCount = hoveredElements.length;
        const hoverHighlightIndex =
          hoveredElements.length === 1
            ? (hoveredElements[0] as HTMLElement).dataset["highlightIndex"]
            : undefined;
        return { hoveredElementCount, hoverHighlightIndex };
      },
    );
    expect(hoveredElementCount).toBe(1);
    expect(hoverHighlightIndex).toBe("1");
    await expect(page).toHaveScreenshot();
  });

  test("should remove highlights by selector", async () => {
    await page.evaluate(() => {
      window.manager.createHighlight({ exact: "This is some" }, { id: 1 });
      window.manager.createHighlight({ exact: "sample text" }, { id: 2 });
      window.manager.removeHighlights(({ id }) => id === 1);
    });

    const highlightCount = await page.evaluate(() => {
      return document.querySelectorAll(".highlight").length;
    });

    expect(highlightCount).toBe(1);
  });

  test("should remove all highlights", async () => {
    await page.evaluate(() => {
      window.manager.createHighlight({ exact: "This is some" }, { id: 1 });
      window.manager.createHighlight({ exact: "sample text" }, { id: 2 });
      window.manager.removeAllHighlights();
    });

    const highlightCount = await page.evaluate(() => {
      return document.querySelectorAll(".highlight").length;
    });

    expect(highlightCount).toBe(0);
  });

  test("should focus a highlight", async () => {
    const highlightIndex = await page.evaluate(() => {
      window.manager.createHighlight({ exact: "This is some" }, { id: 1 });
      window.manager.createHighlight({ exact: "sample text" }, { id: 2 });
      window.manager.createHighlight({ exact: "that we will use" }, { id: 3 });

      window.manager.focusHighlight(({ id }) => id === 2);

      const element = document.querySelector(".highlight-focus") as HTMLElement;
      return element?.dataset["highlightIndex"];
    });

    expect(highlightIndex).toBe("1");
    await expect(page).toHaveScreenshot();
  });

  test("should handle click events", async () => {
    const [{ x, y }] = await page.evaluate(() => {
      window.clickedHighlightIds = [];
      function onClick({ id }: TestData) {
        window.clickedHighlightIds.push(id);
      }
      window.manager.createHighlight(
        { exact: "This is some sample text" },
        {
          id: 1,
        },
        { onClick },
      );
      const highlight2 = window.manager.createHighlight(
        { exact: "sample text that we will use" },
        {
          id: 2,
        },
        { onClick },
      );
      window.manager.createHighlight(
        { exact: "that we will use for our" },
        {
          id: 3,
        },
        { onClick },
      );
      return window.manager.getElementBoundingClientRects(highlight2);
    });
    if (!rect) {
      throw new Error("Failed to get rect");
    }
    const { x, y } = rect;

    // Simulate click just within highlight2
    await page.mouse.click(x + 1, y + 1);
    const clickedHighlightIds = await page.evaluate(() => {
      return window.clickedHighlightIds;
    });

    expect(clickedHighlightIds).toStrictEqual([2]);
  });

  test("should handle window resize", async () => {
    const initialRect = await page.evaluate(() => {
      window.manager.createHighlight(
        { exact: "This is some sample text that we will use" },
        { id: 1 },
      );
      return document.querySelector(".highlight")?.getBoundingClientRect();
    });

    const { height } = page.viewportSize() ?? { height: 500 };
    await page.setViewportSize({ width: 150, height });

    // The highlights don't resize immediately.
    await expect
      .poll(
        async () => {
          const newRect = await page.evaluate(() => {
            return document
              .querySelector(".highlight")
              ?.getBoundingClientRect();
          });
          return newRect;
        },
        {
          message: "highlight bounding rect should resize",
          timeout: 1000,
        },
      )
      .not.toEqual(initialRect);
  });

  test("should combine adjacent rectangles", async () => {
    const elementCount = await page.evaluate(() => {
      // Encompasses hyperlink
      const highlight = window.manager.createHighlight(
        // includes a hyperlink which creates multiple rectangles before combination
        { exact: "use for our highlighting tests." },
        { id: 1 },
      );
      return window.manager.getElementCount(highlight);
    });

    expect(elementCount).toBe(1);
  });

  test("should not create coextensive highlights", async () => {
    const areSame = await page.evaluate(() => {
      const highlight1 = window.manager.createHighlight(
        { exact: "This is some" },
        { id: 1 },
      );
      const highlight2 = window.manager.createHighlight(
        { exact: "This is some" },
        { id: 2 },
      );
      return highlight1.id === highlight2.id;
    });

    expect(areSame).toBe(true);
  });

  test("should log errors for invalid operations", async () => {
    const errorLogged = await page.evaluate(() => {
      let errorLogged = false;
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError(...args);
        errorLogged = true;
      };

      window.manager.focusHighlight(({ id }) => id === 999);

      console.error = originalConsoleError;
      return errorLogged;
    });

    expect(errorLogged).toBe(true);
  });
});

test.describe("HighlightManager with mutable classes", () => {
  test.beforeEach(async () => {
    await page.goto("about:blank");
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .highlight { position: absolute; pointer-events: none; }
            .highlight-color-0 { background-color: aqua; opacity: 50%; }
            .highlight-color-1 { background-color: fuchsia;  opacity: 50%; }
            .highlight-color-2 { background-color: lime;  opacity: 50%; }
            .highlight-hover { outline: 2px solid red; }
            .highlight-focus { outline: 2px solid yellow; }
          </style>
        </head>
        <body>
          <p>This is some sample text that we will use for our <a href="localhost">highlighting tests</a>.</p>
          <script type="module" src="http://localhost:3000/windowWrapper.js"></script>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      // The same as initializeHighlightManager but we can't pass the function getColorClass from the test.
      const container = document.body;

      const getRangesFromAnchor = (
        textQuoteAnchor: textQuote.TextQuoteAnchor,
      ) => {
        const range = window.textQuoteToRange(container, textQuoteAnchor);
        return range ? [range] : [];
      };

      window.manager = new window.HighlightManager({
        container,
        getRangesFromAnchor,
        getHighlightClassNames: ({ id }) => [
          window.classNamesById.get(id) ?? "missing-class",
        ],
      });
    });
  });

  test("should update highlight color class", async () => {
    const initialClasses = await page.evaluate(() => {
      window.classNamesById = new Map([[1, "initial-class"]]);
      const { classNames } = window.manager.createHighlight(
        { exact: "This is some" },
        { id: 1 },
      );
      return classNames;
    });

    const [newClasses] = await page.evaluate(() => {
      window.classNamesById.set(1, "new-class");
      return window.manager.updateHighlightsClassNames(({ id }) => id === 1);
    });

    expect(initialClasses).toStrictEqual(["initial-class"]);
    expect(newClasses).toStrictEqual(["new-class"]);
  });
});

interface TestData {
  id: number;
}

type TestHighlightManager = HighlightManager<
  textQuote.TextQuoteAnchor,
  TestData
>;

type TestHighlight = Highlight<textQuote.TextQuoteAnchor, TestData>;

declare global {
  interface Window {
    manager: TestHighlightManager;
    HighlightManager: typeof HighlightManager;
    textQuoteToRange: typeof textQuote.toRange;
    clickedHighlightIds: number[];
    classNamesById: Map<number, string>;
    highlightToUpdate: TestHighlight;
  }
}
