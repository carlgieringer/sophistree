import cytoscape, {
  EventObjectNode,
  LayoutOptions,
  NodeDataDefinition,
} from "cytoscape";
import ReactDOM from "react-dom/client";
import throttle from "lodash.throttle";
import debounce from "lodash.debounce";

import { sunflower } from "../colors";

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
  // The delay before reactNodes applies a layout when one is necessary.
  layoutThrottleDelay?: number;
  // The delay before rendering the JSX after the node data changes.
  nodeDataRenderDelay?: number;
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

type PassthroughOptions = Pick<ReactNodesOptions, "nodeDataRenderDelay">;

const defaultOptions: Required<
  Pick<ReactNodesOptions, "layoutThrottleDelay" | "nodeDataRenderDelay">
> = {
  layoutThrottleDelay: 500,
  nodeDataRenderDelay: 150,
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
  unselectedStyle: { border: "" },
};

/** A cytoscape extension that renders React elements over nodes. */
function reactNodes(this: cytoscape.Core, options: ReactNodesOptions) {
  const layout = throttle(() => {
    this.layout(options.layoutOptions).run();
  }, options.layoutThrottleDelay ?? defaultOptions.layoutThrottleDelay);

  const { nodeDataRenderDelay } = options;
  options.nodes.forEach((nodeOptions) =>
    makeReactNode(
      this,
      options.logger,
      { ...nodeOptions, nodeDataRenderDelay },
      layout,
    ),
  );

  applyWebkitLayoutWorkaround(this, options.layoutOptions);

  return this; // for chaining
}

// This is a terrible hack to try to get the elements to position correctly in Safari and iOS
// browsers.
// TODO: #31 - address the underlying cause.
function applyWebkitLayoutWorkaround(
  cy: cytoscape.Core,
  layoutOptions: LayoutOptions,
) {
  const ua = navigator.userAgent;
  const isWebKitBrowser = /WebKit/.test(ua) && !/Chrome/.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isWebKitBrowser || isIOS) {
    // eslint-disable-next-line no-inner-declarations
    function oneTimeLayout() {
      cy.off("layoutstop", oneTimeLayout);
      setTimeout(() => {
        cy.layout({
          ...layoutOptions,
          fit: true,
        } as unknown as LayoutOptions).run();
      }, 1000);
    }
    cy.on("layoutstop", oneTimeLayout);
  }
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
  logger: Logger,
  options: ReactNodeOptions & PassthroughOptions,
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

    window.addEventListener("resize", updateNodeHeightToSurroundHtmlWithLayout);
    cy.on("pan zoom resize", updatePosition);
    cy.on("layoutstop", onLayoutStop);
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
      if (node.selected() && options.selectedStyle) {
        Object.assign(htmlElement.style, options.selectedStyle);
      } else if (!node.selected() && options.unselectedStyle) {
        Object.assign(htmlElement.style, options.unselectedStyle);
      }
    });

    // Debounce the node data event handler to reduce Redux updates
    const debouncedDataHandler = debounce(function renderReactNode() {
      renderJsxElement(reactRoot);
    }, options.nodeDataRenderDelay);

    node.on("data", debouncedDataHandler);

    if (options.syncClasses) {
      node.on("style", syncNodeClasses);
    }

    function updateNodeHeightToSurroundHtmlWithLayout() {
      if (updateNodeHeightToSurroundHtml()) {
        layout();
      }
    }

    let isLayingOut = false;
    function onLayoutStop() {
      // Don't infinitely recurse on layouts the extension triggered.
      if (!isLayingOut) {
        isLayingOut = true;
        try {
          updateAfterLayout();
        } finally {
          isLayingOut = false;
        }
      }
    }

    function updatePositionWithLayout() {
      if (updatePosition()) {
        layout();
      }
    }

    /** Returns true if the graph requires layout. */
    function updatePosition() {
      const pos = node.position();
      // TODO: #31 - in Safari sometimes pos has NaN.
      if (isNaN(pos.x) || isNaN(pos.y)) {
        return false;
      }
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

export interface Logger {
  error(message: string): void;
}
