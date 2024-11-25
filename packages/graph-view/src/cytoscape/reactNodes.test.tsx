/** @jest-environment jsdom */

import cytoscape, { NodeDataDefinition } from "cytoscape";
import { act } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import "@testing-library/jest-dom";

import register from "./reactNodes";

describe("reactNodes Cytoscape extension", () => {
  let cy: cytoscape.Core;
  let container: HTMLElement;
  let mockLogger: { error: jest.Mock };

  beforeAll(() => {
    register(cytoscape);
  });

  beforeEach(() => {
    // Setup DOM container
    container = document.createElement("div");
    container.style.width = "600px";
    container.style.height = "600px";
    document.body.appendChild(container);

    // Create Cytoscape instance
    cy = cytoscape({
      container,
      elements: [],
      layout: { name: "preset" },
      style: [
        {
          selector: "node",
          style: {
            width: 20,
            height: 20,
          },
        },
      ],
    });

    // Mock logger
    mockLogger = {
      error: jest.fn(),
    };
  });

  afterEach((): void => {
    document.body.removeChild(container);
  });

  it("should create HTML container for React elements", async () => {
    act(() => {
      cy.add({ data: { id: "test" } });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => (
              <div data-testid="react-node">{data.id}</div>
            ),
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    await waitFor(() => {
      const htmlElements = container.querySelectorAll(
        "[data-testid='react-node']",
      );
      expect(htmlElements.length).toBe(1);
      expect(htmlElements[0]).toHaveTextContent("test");
    });
  });

  it("should update React element when node data changes", async () => {
    type TestNodeData = NodeDataDefinition & {
      label?: string;
    };

    let node: cytoscape.NodeSingular;

    act(() => {
      node = cy.add({
        data: {
          id: "test",
          label: "initial",
        },
      });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => (
              <div data-testid="react-node">{(data as TestNodeData).label}</div>
            ),
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    act(() => {
      node.data("label", "updated");
    });

    await waitFor(() => {
      const htmlElement = container.querySelector("[data-testid='react-node']");
      expect(htmlElement).toHaveTextContent("updated");
    });
  });

  it("should apply selected styles when node is selected", async () => {
    let node: cytoscape.NodeSingular;
    const selectedStyle = { border: "5px solid yellow" };

    act(() => {
      node = cy.add({ data: { id: "test" } });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => (
              <div data-testid="react-node">{data.id}</div>
            ),
            selectedStyle,
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    act(() => {
      node.select();
    });

    await waitFor(() => {
      const htmlElement = container.querySelector(
        "[data-testid='react-node']",
      ) as HTMLElement;
      expect(htmlElement.parentElement?.style.border).toBe(
        selectedStyle.border,
      );
    });
  });

  it("should sync specified classes between node and HTML container", async () => {
    let node: cytoscape.NodeSingular;
    const syncClasses = ["highlight", "special"];

    act(() => {
      node = cy.add({ data: { id: "test" } });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => (
              <div data-testid="react-node">{data.id}</div>
            ),
            syncClasses,
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    act(() => {
      node.addClass("highlight");
    });

    await waitFor(() => {
      const htmlElement = container.querySelector("[data-testid='react-node']");
      expect(htmlElement?.parentElement).toHaveClass("highlight");
    });
  });

  it("should remove HTML element when node is removed", async () => {
    let node: cytoscape.NodeSingular;

    act(() => {
      node = cy.add({ data: { id: "test" } });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => (
              <div data-testid="react-node">{data.id}</div>
            ),
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    act(() => {
      node.remove();
    });

    await waitFor(() => {
      const htmlElements = container.querySelectorAll(
        "[data-testid='react-node']",
      );
      expect(htmlElements.length).toBe(0);
    });
  });

  it("should log error for unsupported modes", async () => {
    act(() => {
      cy.add({ data: { id: "test" } });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => <div>{data.id}</div>,
            mode: "unsupported" as "replace",
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("reactNodes doesnt' support mode unsupported"),
      );
    });
  });

  it("should update position on pan/zoom events", async () => {
    act(() => {
      cy.add({
        data: { id: "test" },
        position: { x: 100, y: 100 },
      });

      cy.reactNodes({
        nodes: [
          {
            query: "node",
            template: (data: NodeDataDefinition) => (
              <div data-testid="react-node">{data.id}</div>
            ),
          },
        ],
        layoutOptions: { name: "preset" },
        logger: mockLogger,
      });
    });

    const htmlElement = container.querySelector(
      "[data-testid='react-node']",
    ) as HTMLElement;
    const initialLeft = htmlElement.style.left;

    act(() => {
      cy.zoom(2);
      cy.pan({ x: 50, y: 50 });
    });

    await waitFor(() => {
      expect(htmlElement.parentElement?.style.left).not.toBe(initialLeft);
      expect(htmlElement.parentElement?.style.transform).toBe("scale(2)");
    });
  });
});
