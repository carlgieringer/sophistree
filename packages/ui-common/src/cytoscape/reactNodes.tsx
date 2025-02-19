import cytoscape, {
  EventObjectNode,
  LayoutOptions,
  NodeDataDefinition,
} from "cytoscape";
import ReactDOM from "react-dom/client";
import debounce from "lodash.debounce";
import throttle from "lodash.throttle";
import type { DebouncedFuncLeading } from "lodash";

import { sunflower } from "../colors";

declare module "cytoscape" {
  interface Core {
    reactNodes(options: ReactNodesOptions): () => void;
  }
}

export default function register(cs: typeof cytoscape) {
  cs("core", "reactNodes", reactNodes);
}

export interface ReactNodesOptions {
  nodes: ReactNodeOptions[];
  layoutOptions: LayoutOptions;
  // The time in milliseconds during which newly added nodes will request a relayout.
  relayoutCutoff?: number;
  // The delay in milliseconds between a node data change and rerendering the JSX.
  nodeDataRenderDelay?: number;
  // The throttle delay in milliseconds for syncing CSS classes between the node and React element.
  syncClassesDelay?: number;
  logger: Logger;
}

export interface ReactNodeOptions {
  query: string;
  component: React.ComponentType<{ data: cytoscape.NodeDataDefinition }>;
  mode?: "replace";
  /** CSS classes to copy from the node to the HTML container */
  syncClasses?: string[];
  containerCSS?: Partial<CSSStyleDeclaration>;
  selectedStyle?: Partial<CSSStyleDeclaration>;
  unselectedStyle?: Partial<CSSStyleDeclaration>;
}

// ReactNodesOptions that are passed through to individual nodes
type PassthroughOptions = Required<
  Pick<
    ReactNodesOptions,
    "nodeDataRenderDelay" | "relayoutCutoff" | "syncClassesDelay"
  >
>;

const defaultOptions: PassthroughOptions = {
  nodeDataRenderDelay: 150,
  relayoutCutoff: 1000,
  syncClassesDelay: 50,
};

const defaultReactNodeOptions: ReactNodeOptions = {
  query: "node", // selector for nodes to apply HTML to
  component: function (data: cytoscape.NodeDataDefinition) {
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
  const { relayoutCutoff, nodeDataRenderDelay, syncClassesDelay, logger } =
    options;
  const requestLayout = debounce(() => {
    this.layout(options.layoutOptions).run();
  });
  const cleanups = options.nodes.map((nodeOptions) =>
    makeReactNode(
      this,
      logger,
      {
        ...nodeOptions,
        relayoutCutoff: relayoutCutoff ?? defaultOptions.relayoutCutoff,
        nodeDataRenderDelay:
          nodeDataRenderDelay ?? defaultOptions.nodeDataRenderDelay,
        syncClassesDelay: syncClassesDelay ?? defaultOptions.syncClassesDelay,
      },
      requestLayout,
    ),
  );

  applyWebkitLayoutWorkaround(this, options.layoutOptions);

  function cleanup() {
    cleanups.forEach((c) => c());
  }

  return cleanup;
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
        cy.layout(layoutOptions).run();
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
  requestLayout: () => void,
) {
  options = Object.assign({}, defaultReactNodeOptions, options);

  let needsRelayout = true;

  // Apply HTML to matching nodes
  cy.nodes(options.query).forEach((node) => {
    createHtmlNode(node, true);
  });

  setTimeout(() => {
    needsRelayout = false;
  }, options.relayoutCutoff);

  // Apply HTML to new nodes that match the query
  cy.on("add", options.query, createHtmlNodeWithRelayout);

  function createHtmlNodeWithRelayout(event: EventObjectNode) {
    createHtmlNode(event.target, needsRelayout);
  }

  function cleanup() {
    cy.off("add", createHtmlNodeWithRelayout);
  }

  return cleanup;

  /**
   * Creates a React element for node.
   *
   * @param needsRelayout whether to request a layout the first time the node observes a
   * layout to stop. This helps React nodes layout properly after the initial layout, which often
   * requires adjustment to accommodate the newly rendered JSX.
   */
  function createHtmlNode(node: cytoscape.NodeSingular, needsRelayout = false) {
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

    cy.on("pan zoom resize", updatePosition);

    const onLayoutStop = function onLayoutStop() {
      const didChange = updateNodeHeightToSurroundHtml();
      if (needsRelayout) {
        needsRelayout = false;
        if (didChange) {
          requestLayout();
        }
      }
    };
    cy.on("layoutstop", onLayoutStop);

    node.on("position", updatePosition);

    node.on("remove", function removeHtmlElement() {
      htmlElement.remove();
      cy.off("pan zoom resize", updatePosition);
      cy.off("layoutstop", onLayoutStop);
      onNodeData.cancel();
      throttledSyncNodeClasses?.cancel();
    });

    node.on("select unselect", function onNodeSelectUnselect() {
      if (node.selected() && options.selectedStyle) {
        Object.assign(htmlElement.style, options.selectedStyle);
      } else if (!node.selected() && options.unselectedStyle) {
        Object.assign(htmlElement.style, options.unselectedStyle);
      }
    });

    // Debounce the node data event handler to reduce Redux updates
    const onNodeData = debounce(function onNodeData() {
      renderJsxElement(reactRoot);
    }, options.nodeDataRenderDelay);
    node.on("data", onNodeData);

    let throttledSyncNodeClasses = undefined as
      | DebouncedFuncLeading<typeof syncNodeClasses>
      | undefined;
    if (options.syncClasses) {
      throttledSyncNodeClasses = throttle(
        syncNodeClasses,
        options.syncClassesDelay,
      );
      node.on("style", throttledSyncNodeClasses);
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

    function renderJsxElement(root: ReactDOM.Root) {
      const Component = options.component;
      root.render(<Component data={node.data() as NodeDataDefinition} />);
    }

    function syncNodeClasses() {
      const toAdd = [] as string[];
      const toRemove = [] as string[];
      options.syncClasses?.forEach((className) => {
        const elementHasClass = htmlElement.classList.contains(className);
        if (node.hasClass(className)) {
          if (!elementHasClass) {
            toAdd.push(className);
          }
        } else if (elementHasClass) {
          toRemove.push(className);
        }
      });
      if (toAdd.length) {
        htmlElement.classList.add(...toAdd);
      }
      if (toRemove.length) {
        htmlElement.classList.remove(...toRemove);
      }
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
  info(message: string): void;
}
