import cytoscape from "cytoscape";
import ReactDOM from "react-dom/client";
import { sunflower } from "../colors";

declare module "cytoscape" {
  interface Core {
    reactNodes(options: ReactNodesOptions): void;
  }
}

export default function register(cs: typeof cytoscape) {
  cs("core", "reactNodes", reactNodes);
}

const defaultOptions = {
  layoutDelay: 100,
};

const defaultReactNodeOptions: ReactNodeOptions = {
  query: "node", // selector for nodes to apply HTML to
  template: function (data: cytoscape.NodeDataDefinition) {
    // function to generate HTML
    return <div>{data.id}</div>;
  },
  containerCSS: {
    // CSS for the HTML container
    textAlign: "center",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
};

export interface ReactNodeOptions {
  query: string;
  template: (data: any) => JSX.Element;
  /** CSS classes to copy from the node to the HTML container */
  syncClasses?: string[];
  containerCSS?: Partial<CSSStyleDeclaration>;
}

interface ReactNodesOptions {
  nodes: ReactNodeOptions[];
  layout: cytoscape.LayoutOptions;
  layoutDelay?: number;
}

function reactNodes(this: cytoscape.Core, options: ReactNodesOptions) {
  const cy = this;

  // debounce layout function to avoid layout thrashing
  const layout = debounce(function layout() {
    cy.layout(options.layout).run();
  }, options.layoutDelay ?? defaultOptions.layoutDelay);

  options.nodes.forEach((o) => makeReactNode(cy, o, layout));

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
  layout: () => void
) {
  options = Object.assign({}, defaultReactNodeOptions, options);

  function createHtmlNode(node: cytoscape.NodeSingular) {
    var htmlElement = document.createElement("div");
    var jsxElement = options.template(node.data());
    const root = ReactDOM.createRoot(htmlElement);
    root.render(jsxElement);
    Object.assign(htmlElement.style, options.containerCSS);

    htmlElement.style.position = "absolute";

    options.syncClasses?.forEach((className) => {
      if (node.hasClass(className)) {
        htmlElement.classList.add(className);
      }
    });
    const container = cy.container();
    if (!container) throw new Error("Cytoscape container not found");
    container.appendChild(htmlElement);

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
      htmlElement.style.left = left + "px";
      htmlElement.style.top = top + "px";
      const widthStyle = elementWidth + "px";
      const oldWidth = htmlElement.style.width;
      htmlElement.style.width = widthStyle;
      htmlElement.style.transform = `scale(${zoom})`;
      htmlElement.style.transformOrigin = "top left";
      return oldWidth !== widthStyle;
    }

    function updateNodeHeightToSurroundHtml() {
      const height = htmlElement.offsetHeight;
      const oldHeight = node.data("height");
      node.data("height", height);
      return oldHeight !== height;
    }

    // Give the react node a chance to layout to get a real height
    setTimeout(updateInitialLayout, 0);

    function updateInitialLayout() {
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

    window.addEventListener("resize", updateNodeHeightToSurroundHtmlWithLayout);
    node.on("position", updatePositionWithLayout);
    node.on("remove", function () {
      htmlElement.remove();
    });
    node.on("select unselect", function () {
      if (node.selected()) {
        htmlElement.style.border = `5px solid ${sunflower}`;
      } else {
        htmlElement.style.border = "";
      }
    });
    node.on("data", function () {
      var jsxElement = options.template(node.data());
      root.render(jsxElement);
    });
    if (options.syncClasses) {
      node.on("style", function () {
        options.syncClasses?.forEach((className) => {
          if (node.hasClass(className)) {
            htmlElement.classList.add(className);
          } else {
            htmlElement.classList.remove(className);
          }
        });
      });
    }
    cy.on("pan zoom resize", updatePosition);
  }

  // Apply HTML to matching nodes
  cy.nodes(options.query).forEach(createHtmlNode);

  // Apply HTML to new nodes that match the query
  cy.on("add", options.query, function (event) {
    createHtmlNode(event.target);
  });
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined;

  return function executedFunction(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): void {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
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
