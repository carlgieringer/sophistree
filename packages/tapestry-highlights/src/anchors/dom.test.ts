import {
  nodeIsBefore,
  nodePositionCompare,
  getPreviousLeafNode,
  isTextNode,
} from "./dom.js";
import { JSDOM } from "jsdom";

describe("nodeIsBefore", () => {
  test("returns true when first node is before second node", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="first">First</span>
        <span id="second">Second</span>
      </div>
    `).window;
    const node1 = document.getElementById("first")!;
    const node2 = document.getElementById("second")!;

    expect(nodeIsBefore(node1, node2)).toBe(true);
  });

  test("returns false when first node is after second node", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="second">Second</span>
        <span id="first">First</span>
      </div>
    `).window;
    const node1 = document.getElementById("first")!;
    const node2 = document.getElementById("second")!;

    expect(nodeIsBefore(node1, node2)).toBe(false);
  });
});

describe("nodePositionCompare", () => {
  test("returns 0 when nodes are the same", () => {
    const { document } = new JSDOM(`<div id="node">Same Node</div>`).window;
    const node1 = document.getElementById("node")!;
    const node2 = document.getElementById("node")!;
    expect(nodePositionCompare(node1, node2)).toBe(0);
  });

  test("returns -1 when first node contains second node", () => {
    const { document } = new JSDOM(`
      <div id="parent">
        <span id="child">Child</span>
      </div>
    `).window;
    const parent = document.getElementById("parent")!;
    const child = document.getElementById("child")!;

    expect(nodePositionCompare(parent, child)).toBe(-1);
  });

  test("returns 1 when second node contains first node", () => {
    const { document } = new JSDOM(`
      <div id="parent">
        <span id="child">Child</span>
      </div>
    `).window;
    const parent = document.getElementById("parent")!;
    const child = document.getElementById("child")!;

    expect(nodePositionCompare(child, parent)).toBe(1);
  });

  test("returns -1 when first node is before second node in document order", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="first">First</span>
        <span id="second">Second</span>
      </div>
    `).window;
    const node1 = document.getElementById("first")!;
    const node2 = document.getElementById("second")!;

    expect(nodePositionCompare(node1, node2)).toBe(-1);
  });

  test("returns 1 when first node is after second node in document order", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="second">Second</span>
        <span id="first">First</span>
      </div>
    `).window;
    const node1 = document.getElementById("first")!;
    const node2 = document.getElementById("second")!;

    expect(nodePositionCompare(node1, node2)).toBe(1);
  });

  test("handles nodes in different branches of the DOM tree", () => {
    const { document } = new JSDOM(`
      <div>
        <div id="branch1">
          <span id="node1">Node 1</span>
        </div>
        <div id="branch2">
          <span id="node2">Node 2</span>
        </div>
      </div>
    `).window;
    const node1 = document.getElementById("node1")!;
    const node2 = document.getElementById("node2")!;

    expect(nodePositionCompare(node1, node2)).toBe(-1);
    expect(nodePositionCompare(node2, node1)).toBe(1);
  });
});

describe("getPreviousLeafNode", () => {
  test("returns the previous leaf node when it exists", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="first">First</span>
        <span id="second">Second</span>
      </div>
    `).window;
    const node1 = document.getElementById("first")!.firstChild;
    const node2 = document.getElementById("second")!;

    expect(getPreviousLeafNode(node2)).toBe(node1);
  });

  test("returns the last descendant of the previous sibling", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="leaf1">Leaf 1</span>
      </div>
      <span id="node2">Node 2</span>
    `).window;
    const leaf1 = document.getElementById("leaf1")!.firstChild;
    const node2 = document.getElementById("node2")!;

    expect(getPreviousLeafNode(node2)).toBe(leaf1);
  });

  test("traverses up the tree to find the previous leaf node", () => {
    const { document } = new JSDOM(`
      <div>
        <span id="leaf1">Leaf 1</span>
      </div>
      <div>
        <div>
          <span id="leaf2">Leaf 2</span>
        </div>
      </div>
    `).window;
    const leaf1 = document.getElementById("leaf1")!.firstChild;
    const leaf2 = document.getElementById("leaf2")!;

    expect(getPreviousLeafNode(leaf2)).toBe(leaf1);
  });
});

describe("isTextNode", () => {
  test("returns true for text nodes", () => {
    const { document } = new JSDOM(`<div>Text Node</div>`).window;
    const textNode = document.querySelector("div")!.firstChild!;
    expect(isTextNode(textNode)).toBe(true);
  });

  test("returns false for element nodes", () => {
    const { document } = new JSDOM(`<div id="element">Element Node</div>`)
      .window;
    const elementNode = document.getElementById("element")!;
    expect(isTextNode(elementNode)).toBe(false);
  });

  test("returns false for comment nodes", () => {
    const { document } = new JSDOM(`<div><!-- Comment Node --></div>`).window;
    const commentNode = document.querySelector("div")!.firstChild!;
    expect(isTextNode(commentNode)).toBe(false);
  });
});
