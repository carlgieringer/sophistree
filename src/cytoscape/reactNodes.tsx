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

interface ReactNodeOptions {
  query: string;
  template: (data: cytoscape.NodeDataDefinition) => JSX.Element;
  containerCSS?: Partial<CSSStyleDeclaration>;
}

interface ReactNodesOptions {
  nodes: [ReactNodeOptions];
  layout: cytoscape.LayoutOptions;
  layoutDelay?: number;
}

function reactNodes(this: cytoscape.Core, options: ReactNodesOptions) {
  var cy = this;

  // debounce layout function to avoid layout thrashing
  const layout = debounce(function layout() {
    console.debug("Delayed layout");
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
    ReactDOM.createRoot(htmlElement).render(jsxElement);
    Object.assign(htmlElement.style, options.containerCSS);

    htmlElement.style.position = "absolute";
    const container = cy.container();
    if (!container) throw new Error("Cytoscape container not found");
    container.appendChild(htmlElement);

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
      if (htmlElement.style.width !== widthStyle) {
        layout();
      }
      htmlElement.style.width = widthStyle;
      htmlElement.style.transform = `scale(${zoom})`;
      htmlElement.style.transformOrigin = "top left";
    }

    function updateNodeHeightToSurroundHtml() {
      const height = htmlElement.offsetHeight;
      if (node.data("height") !== height) {
        layout();
      }
      node.data("height", height);
    }

    updatePosition();
    updateNodeHeightToSurroundHtml();

    window.addEventListener("resize", updateNodeHeightToSurroundHtml);
    node.on("position", updatePosition);
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
