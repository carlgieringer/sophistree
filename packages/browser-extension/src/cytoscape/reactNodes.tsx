import React from "react";
import cytoscape, { EventObjectNode, NodeDataDefinition } from "cytoscape";
import ReactDOM from "react-dom/client";
import debounce from "lodash.debounce";

import { sunflower } from "../colors";
import * as appLogger from "../logging/appLogging";

declare module "cytoscape" {
  interface Core {
    reactNodes(options: ReactNodesOptions): void;
  }
}

export default function register(cs: typeof cytoscape) {
  cs("core", "reactNodes", reactNodes);
}

interface ReactNodesOptions {
  nodes: ReactNodeOptions[];
  layoutOptions: cytoscape.LayoutOptions;
  // The debounce delay before reactNodes applies a layout when one is necessary.
  layoutDebounceDelay?: number;
}

export interface ReactNodeOptions {
  query: string;
  template: (data: cytoscape.NodeDataDefinition) => JSX.Element;
  mode?: "replace";
  /** CSS classes to copy from the node to the HTML container */
  syncClasses?: string[];
  containerCSS?: Partial<CSSStyleDeclaration>;
  selectedStyle?: Partial<CSSStyleDeclaration>;
  unselectedStyle?: Partial<CSSStyleDeclaration>;
}

const defaultOptions: Required<Pick<ReactNodesOptions, "layoutDebounceDelay">> =
  {
    layoutDebounceDelay: 100,
  };

const defaultReactNodeOptions: ReactNodeOptions = {
  query: "node", // selector for nodes to apply HTML to
  template: function (data: cytoscape.NodeDataDefinition) {
    // function to generate HTML
    return <div>{data.id}</div>;
  },
  mode: "replace",
  containerCSS: {
    // CSS for the HTML container
    textAlign: "center",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
  selectedStyle: { border: `5px solid ${sunflower}` },
  unselectedStyle: { border: "none" },
};

/** A cytoscape extension that renders React elements over nodes. */
function reactNodes(this: cytoscape.Core, options: ReactNodesOptions) {
  // debounce layout function to avoid layout thrashing
  const layout = debounce(() => {
    this.layout(options.layoutOptions).run();
  }, options.layoutDebounceDelay ?? defaultOptions.layoutDebounceDelay);

  options.nodes.forEach((nodeOptions) =>
    makeReactNode(this, nodeOptions, layout),
  );

  return this; // for chaining
}

/**
 * Make an HTML element hosting a react element and attach it to the
 * Cytoscape container.
 *
 * @param cy The cytoscape core instance
 * @param options The options for the react node
 * @param layout function to layout the graph. Called whenever layout affecting attributes changes,
 * such as node width or react element height.
 */
function makeReactNode(
  cy: cytoscape.Core,
  options: ReactNodeOptions,
  layout: () => void,
) {
  options = Object.assign({}, defaultReactNodeOptions, options);

  // Apply HTML to matching nodes
  cy.nodes(options.query).forEach(createHtmlNode);

  // Apply HTML to new nodes that match the query
  cy.on("add", options.query, function (event: EventObjectNode) {
    createHtmlNode(event.target);
  });

  function createHtmlNode(node: cytoscape.NodeSingular) {
    switch (options.mode) {
      case "replace":
        node.style("opacity", 0);
        break;
      default:
        appLogger.error(`reactNodes doesnt' support mode ${options.mode}`);
    }

    const htmlElement = document.createElement("div");
    Object.assign(htmlElement.style, options.containerCSS, {
      position: "absolute",
    });
    if (options.syncClasses) {
      syncNodeClasses();
    }

    const reactRoot = ReactDOM.createRoot(htmlElement);
    renderJsxElement(reactRoot);

    const container = cy.container();
    if (!container) throw new Error("Cytoscape container not found");
    container.appendChild(htmlElement);

    let isLayingOut = false;

    window.addEventListener("resize", updateNodeHeightToSurroundHtmlWithLayout);
    cy.on("pan zoom resize", updatePosition);
    cy.on("layoutstop", function onLayout() {
      // Don't infinitely recurse on layouts the extension triggered.
      if (!isLayingOut) {
        isLayingOut = true;
        try {
          updateAfterLayout();
        } finally {
          isLayingOut = true;
        }
      }
    });
    node.on("position", updatePositionWithLayout);
    node.on("remove", function removeHtmlElement() {
      htmlElement.remove();
      window.removeEventListener(
        "resize",
        updateNodeHeightToSurroundHtmlWithLayout,
      );
      cy.off("pan zoom resize", updatePosition);
    });
    node.on("select unselect", function onNodeSelectUnselect() {
      if (node.selected()) {
        Object.assign(htmlElement.style, options.selectedStyle ?? {});
      } else {
        Object.assign(htmlElement.style, options.unselectedStyle ?? {});
      }
    });
    node.on("data", function renderReactNode() {
      renderJsxElement(reactRoot);
    });
    if (options.syncClasses) {
      node.on("style", syncNodeClasses);
    }

    /** Returns true if the graph requires layout. */
    function updatePosition() {
      const pos = node.position();
      const zoom = cy.zoom();
      const pan = cy.pan();
      const nodeWidth = node.width();
      const elementWidth = nodeWidth - getInnerHorizontalSpacing(htmlElement);
      const nodeHeight = node.height();

      const left = pan.x + pos.x * zoom - (nodeWidth * zoom) / 2;
      const top = pan.y + pos.y * zoom - (nodeHeight * zoom) / 2;
      const oldWidth = htmlElement.style.width;
      const widthStyle = elementWidth + "px";
      htmlElement.style.left = left + "px";
      htmlElement.style.top = top + "px";
      htmlElement.style.width = widthStyle;
      htmlElement.style.transform = `scale(${zoom})`;
      htmlElement.style.transformOrigin = "top left";
      return oldWidth !== widthStyle;
    }

    function updateNodeHeightToSurroundHtml() {
      const height = htmlElement.offsetHeight;
      const oldHeight = getHeight(node) ?? 0;
      node.data("height", height);
      return oldHeight !== height;
    }

    function updateAfterLayout() {
      let isLayoutRequired = updatePosition();
      isLayoutRequired = updateNodeHeightToSurroundHtml() || isLayoutRequired;
      if (isLayoutRequired) {
        layout();
      }
    }

    function updateNodeHeightToSurroundHtmlWithLayout() {
      if (updateNodeHeightToSurroundHtml()) {
        layout();
      }
    }

    function updatePositionWithLayout() {
      if (updatePosition()) {
        layout();
      }
    }

    function renderJsxElement(root: ReactDOM.Root) {
      const jsxElement = options.template(node.data() as NodeDataDefinition);
      root.render(jsxElement);
    }

    function syncNodeClasses() {
      options.syncClasses?.forEach((className) => {
        if (node.hasClass(className)) {
          htmlElement.classList.add(className);
        } else {
          htmlElement.classList.remove(className);
        }
      });
    }
  }
}

function getInnerHorizontalSpacing(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const padding =
    parseFloat(style.paddingLeft || "0") +
    parseFloat(style.paddingRight || "0") +
    parseFloat(style.borderLeftWidth || "0") +
    parseFloat(style.borderRightWidth || "0");
  return padding;
}

function getHeight(node: cytoscape.NodeSingular) {
  return node.data("height") as number | undefined;
}
