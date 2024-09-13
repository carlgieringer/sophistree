import cytoscape from "cytoscape";

declare module "cytoscape" {
  interface Core {
    htmlNode(options: HtmlNodeOptions): void;
  }
}

const defaultOptions: HtmlNodeOptions = {
  query: "node", // selector for nodes to apply HTML to
  template: function (data: cytoscape.NodeDataDefinition) {
    // function to generate HTML
    return "<div>" + data.id + "</div>";
  },
  containerCSS: {
    // CSS for the HTML container
    textAlign: "center",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
};

interface HtmlNodeOptions {
  query: string;
  template: (data: cytoscape.NodeDataDefinition) => string;
  containerCSS?: Partial<CSSStyleDeclaration>;
}

export default function register(cs: typeof cytoscape) {
  cs("core", "htmlNode", htmlNode);
}

function htmlNode(this: cytoscape.Core, options: HtmlNodeOptions) {
  var cy = this;

  options = Object.assign({}, defaultOptions, options);

  // Function to create and update HTML nodes
  function createHtmlNode(node: cytoscape.NodeSingular) {
    var data = node.data();
    var htmlContent = options.template(data);

    var htmlElement = document.createElement("div");
    htmlElement.id = "html-node-" + data.id;
    htmlElement.innerHTML = htmlContent;
    Object.assign(htmlElement.style, options.containerCSS);

    htmlElement.style.position = "absolute";
    htmlElement.style.zIndex = "1";
    // htmlElement.style.pointerEvents = "none"; // Allows interacting with the node beneath
    const container = cy.container();
    if (!container) throw new Error("Cytoscape container not found");
    container.appendChild(htmlElement);

    function updatePosition() {
      var pos = node.position();
      var zoom = cy.zoom();
      var pan = cy.pan();
      var nodeWidth = node.width();
      var nodeHeight = node.height();

      var left = pan.x + pos.x * zoom - (nodeWidth * zoom) / 2;
      var top = pan.y + pos.y * zoom - (nodeHeight * zoom) / 2;
      htmlElement.style.left = left + "px";
      htmlElement.style.top = top + "px";
      htmlElement.style.width = nodeWidth + "px";
      htmlElement.style.height = nodeHeight + "px";
      htmlElement.style.transform = `scale(${zoom})`;
      htmlElement.style.transformOrigin = "top left";
    }

    updatePosition();

    node.on("position", updatePosition);
    node.on("remove", function () {
      htmlElement.remove();
    });
    node.on("select unselect", function () {
      if (node.selected()) {
        htmlElement.style.border = "1px solid red";
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

  return this; // for chaining
}
