import { normalizeRange } from "./ranges.js";
import { JSDOM } from "jsdom";

describe("normalizeRange", () => {
  test("normalizes range that ends at start of next node", () => {
    const { document } = new JSDOM(`
      <div>
        <p id="first">First paragraph</p>
        <p id="second">Second paragraph</p>
      </div>
    `).window;

    const range = document.createRange();
    const firstPara = document.getElementById("first")!;
    const secondPara = document.getElementById("second")!;

    // Create a range from start of first paragraph to start of second paragraph
    range.setStart(firstPara.firstChild!, 0);
    range.setEnd(secondPara, 0);

    const logger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
    normalizeRange(range, logger);

    // Range should now end at the end of the first paragraph's text
    expect(range.endContainer).toBe(firstPara.firstChild);
    expect(range.endOffset).toBe(firstPara.firstChild!.textContent!.length);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test("does not modify range that doesn't need normalization", () => {
    const { document } = new JSDOM(`
      <div>
        <p id="para">Some text</p>
      </div>
    `).window;

    const range = document.createRange();
    const para = document.getElementById("para")!;
    const text = para.firstChild!;

    // Create a normal range within the paragraph
    range.setStart(text, 0);
    range.setEnd(text, 4); // Selects "Some"

    const originalEndContainer = range.endContainer;
    const originalEndOffset = range.endOffset;

    const logger = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
    normalizeRange(range, logger);

    // Range should remain unchanged
    expect(range.endContainer).toBe(originalEndContainer);
    expect(range.endOffset).toBe(originalEndOffset);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
