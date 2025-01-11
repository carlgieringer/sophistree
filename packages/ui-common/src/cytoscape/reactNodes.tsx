import cytoscape, {
  EventObjectNode,
  LayoutOptions,
  NodeDataDefinition,
  NodeSingular,
} from "cytoscape";
import ReactDOM from "react-dom/client";

import { sunflower } from "../colors";
import debounce from "lodash.debounce";

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
  layoutOptions: LayoutOptions;
  logger: Logger;
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

const defaultReactNodeOptions: ReactNodeOptions = {
  query: "node",
  template: function (data: cytoscape.NodeDataDefinition) {
    return <div>{data.id}</div>;
  },
  mode: "replace",
  containerCSS: {
    textAlign: "center",
    borderRadius: "10px",
    border: "1px solid #ccc",
    // Nodes should have the same height/width when they are selected
    boxSizing: "border-box",
  },
  selectedStyle: { border: `5px solid ${sunflower}` },
  unselectedStyle: { border: "" },
};

/**
 * A cytoscape extension that renders React elements over nodes.
 *
 * Requirements:
 *
 * Rendering:
 * - React elements must be positioned precisely over their corresponding Cytoscape nodes
 * - React elements must remain correctly positioned during pan, zoom, and graph manipulation
 * - The system must handle both initial node rendering and dynamically added nodes
 * - The system must work consistently across different browsers and platforms
 *
 * Sizing:
 * - React elements must have a predictable and consistent sizing model
 * - Changes in React element size must be detected and handled appropriately
 * - Size changes should trigger layout updates only when necessary
 * - Layout updates must not create infinite update cycles
 *
 * Performance:
 * - The system must efficiently handle graphs with many nodes
 * - Updates may be batched or debounced to prevent excessive re-renders
 * - Memory usage must be properly managed, especially for dynamic graphs
 * - Event listeners must be properly managed to prevent memory leaks
 *
 * Integration:
 * - The extension must integrate cleanly with Cytoscape's existing systems
 * - It must not interfere with other Cytoscape extensions or features
 *
 * Current implementation:
 *
 * - The Cytoscape node determines the width of the React element.
 * - The React element's content grows vertically, and the Cytoscape node must
 *   grow vertically to match the React element.
 * - When the node's data changes, it should re-render the React JSX in case the data changes the rendering.
 * - When the extension changes the height of a Cytoscape node, we should request a layout
 *   to ensure that the graph is laid out to accomodate the new height.
 * - When the Cytoscape node position changes (e.g. during a layout), the React element
 *   must move to match it. Since position changes are assumed to come from layouts,
 *   we must never request a layout in response to a position change.
 * - We should not request a layout when one is already active.
 */
function reactNodes(this: cytoscape.Core, options: ReactNodesOptions) {
  let isLayingOut = false;
  let pendingLayout = false;

  const requestLayout = debounce(() => {
    if (isLayingOut) {
      pendingLayout = true;
      return;
    }
    isLayingOut = true;
    this.layout(options.layoutOptions).run();
  }, 150); // Debounce layout requests

  this.on("layout", () => {
    isLayingOut = true;
  });

  this.on("layoutstop", () => {
    isLayingOut = false;
    if (pendingLayout) {
      pendingLayout = false;
      requestLayout();
    }
  });
  options.nodes.map((nodeOptions) =>
    makeReactNode(this, options.logger, nodeOptions, requestLayout),
  );

  applyWebkitLayoutWorkaround(this);

  return this; // for chaining
}

// Improved WebKit handling with proper position validation and layout stabilization
function applyWebkitLayoutWorkaround(cy: cytoscape.Core) {
  const ua = navigator.userAgent;
  const isWebKitBrowser = /WebKit/.test(ua) && !/Chrome/.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);

  if (isWebKitBrowser || isIOS) {
    // Add position validation to prevent NaN positions
    cy.on("position", "node", function (evt) {
      const node = evt.target as NodeSingular;
      const pos = node.position();
      if (isNaN(pos.x) || isNaN(pos.y)) {
        // Restore last valid position or default to center
        const lastValidPos = (node.scratch("_lastValidPosition") as {
          x: number;
          y: number;
        }) || { x: 0, y: 0 };
        node.position(lastValidPos);
      } else {
        // Store valid position
        node.scratch("_lastValidPosition", { ...pos });
      }
    });

    // More stable layout approach for WebKit
    cy.on("layoutstop", function () {
      requestAnimationFrame(() => {
        cy.nodes().positions((node: NodeSingular) => {
          const pos = node.position();
          return {
            x: Math.round(pos.x * 100) / 100, // Reduce floating point precision issues
            y: Math.round(pos.y * 100) / 100,
          };
        });
      });
    });
  }
}

/**
 * Make an HTML element hosting a react element and attach it to the
 * Cytoscape container.
 *
 * @param cy The cytoscape core instance
 * @param options The options for the react node
 * @param requestLayout function to request a graph layout. Called whenever layout affecting attributes changes,
 * such as node width or react element height.
 */
function makeReactNode(
  cy: cytoscape.Core,
  logger: Logger,
  options: ReactNodeOptions,
  requestLayout: () => void,
) {
  options = Object.assign({}, defaultReactNodeOptions, options);

  // Apply HTML to existing matching nodes
  cy.nodes(options.query).map(createHtmlNode);

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
        logger.error(`reactNodes doesnt' support mode ${options.mode}`);
    }

    const htmlElement = document.createElement("div");
    Object.assign(htmlElement.style, options.containerCSS, {
      position: "absolute",
    });
    if (options.syncClasses) {
      syncNodeClasses();
    }
    if (node.selected() && options.selectedStyle) {
      Object.assign(htmlElement.style, options.selectedStyle);
    }

    const reactRoot = ReactDOM.createRoot(htmlElement);
    renderJsxElement(reactRoot);

    const container = cy.container();
    if (!container) throw new Error("Cytoscape container not found");
    container.appendChild(htmlElement);

    const updatePosition = () => {
      const pos = node.position();
      if (isNaN(pos.x) || isNaN(pos.y)) {
        return;
      }

      // Cache values before RAF to reduce reflows
      const zoom = cy.zoom();
      const pan = cy.pan();
      const nodeWidth = node.width();
      const elementWidth = nodeWidth - getInnerHorizontalSpacing(htmlElement);
      const nodeHeight = node.height();

      // Batch DOM updates
      const left =
        Math.round((pan.x + pos.x * zoom - (nodeWidth * zoom) / 2) * 100) / 100;
      const top =
        Math.round((pan.y + pos.y * zoom - (nodeHeight * zoom) / 2) * 100) /
        100;

      const style = htmlElement.style;
      style.top = `${top}px`;
      style.left = `${left}px`;
      style.width = `${elementWidth}px`;
      style.transform = `scale(${zoom})`;
      style.transformOrigin = "top left";
    };

    cy.on("pan zoom resize", updatePosition);

    node.on("position", updatePosition);

    node.on("select unselect", function onNodeSelectUnselect() {
      if (node.selected() && options.selectedStyle) {
        Object.assign(htmlElement.style, options.selectedStyle);
      } else if (!node.selected() && options.unselectedStyle) {
        Object.assign(htmlElement.style, options.unselectedStyle);
      }
    });

    node.on("data", function onNodeData() {
      renderJsxElement(reactRoot);
    });

    if (options.syncClasses) {
      node.on("style", syncNodeClasses);
    }

    node.on("remove", function removeHtmlElement() {
      htmlElement.remove();
      cy.off("pan zoom resize", updatePosition);
    });

    function renderJsxElement(root: ReactDOM.Root) {
      const jsxElement = options.template(node.data() as NodeDataDefinition);
      root.render(jsxElement);
      if (updateNodeHeightToSurroundHtml()) {
        requestLayout();
      }
    }

    function updateNodeHeightToSurroundHtml() {
      const height = htmlElement.offsetHeight;
      const oldHeight = getHeight(node) ?? 0;
      node.data({ height });
      return oldHeight !== height;
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

export interface Logger {
  error(message: string): void;
}
