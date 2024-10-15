import { test, expect, type Page } from "@playwright/test";

import { DomAnchorHighlightManager } from "../src/DomAnchorHighlightManager.js";

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

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
          <p>This is some sample text that we will use for our highlighting tests.</p>
          <script type="module" src="http://localhost:3000/windowWrapper.js"></script>
        </body>
      </html>
    `);

  await page.evaluate(() => {
    window.domAnchorManager = new window.DomAnchorHighlightManager({
      container: document.body,
      getHighlightClassNames: (data, index) => [`highlight-color-${index % 3}`],
    });
  });
});

test("should create a highlight from the current selection", async () => {
  const highlightCount = await page.evaluate(() => {
    const range = window.textQuoteToRange(document.body, {
      exact: "This is some sample text that we will use",
    });
    const selection = window.document.getSelection();
    if (!selection) {
      throw new Error("Failed to get selection.");
    }
    selection.addRange(range!);

    window.domAnchorManager.createHighlightFromCurrentSelection({ id: 1 });

    return document.querySelectorAll(".highlight").length;
  });
  expect(highlightCount).toBe(1);
});

test("should create a highlight from a provided selection", async () => {
  const highlightCount = await page.evaluate(() => {
    const range = window.textQuoteToRange(document.body, {
      exact: "This is some sample text that we will use",
    });
    const selection = window.document.getSelection();
    if (!selection) {
      throw new Error("Failed to get selection.");
    }
    selection.addRange(range!);

    window.domAnchorManager.createHighlightFromSelection(selection, { id: 1 });

    return document.querySelectorAll(".highlight").length;
  });
  expect(highlightCount).toBe(1);
});

test("should create a highlight from a range", async () => {
  const highlightCount = await page.evaluate(() => {
    const range = window.textQuoteToRange(document.body, {
      exact: "This is some sample text that we will use",
    });
    if (!range) {
      throw new Error("Failed to create range");
    }

    window.domAnchorManager.createHighlightFromRange(range, { id: 1 });

    return document.querySelectorAll(".highlight").length;
  });
  expect(highlightCount).toBe(1);
});

interface TestData {
  id: number;
}

type TestHighlightManager = DomAnchorHighlightManager<TestData>;

declare global {
  interface Window {
    domAnchorManager: TestHighlightManager;
    DomAnchorHighlightManager: typeof DomAnchorHighlightManager;
  }
}
