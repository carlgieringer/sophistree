import { Stylesheet } from "cytoscape";

import {
  carrot,
  nephritis,
  pomegranate,
  sunflower,
  peterRiver,
} from "../colors";

export const stylesheet: Stylesheet[] = [
  {
    selector: "node",
    style: {
      "text-valign": "center",
      "text-halign": "center",
      "text-wrap": "wrap",
      "text-max-width": "200px",
    } as const,
  },
  {
    selector: 'node[entity.type="Proposition"]',
    style: {
      shape: "round-rectangle",
      label: "data(entity.text)",
      width: "label",
    },
  },
  {
    selector: `node[entity.type="Proposition"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: `node[entity.type="MediaExcerpt"]`,
    style: {
      shape: "round-rectangle",
      label: "data(entity.quotation)",
      width: "label",
    },
  },
  {
    selector: `node[entity.type="MediaExcerpt"][height]`,
    style: {
      // reactNodes will dynamically set the nodes' height to match the wrapped JSX.
      height: "data(height)",
    },
  },
  {
    selector: `edge`,
    style: {
      width: 2,
      "line-color": "#ccc",
      "source-arrow-shape": "circle",
      "target-arrow-color": "#ccc",
      "target-arrow-shape": (edge) =>
        edge.data("polarity") === "Positive" ? "triangle-backcurve" : "tee",
      "line-style": (edge) => {
        return edge.data("outcome") === "Invalid" ? "dashed" : "solid";
      },
      "line-dash-pattern": [20, 10],
      "arrow-scale": 1.5,
      "curve-style": "straight",
      "target-endpoint": "outside-to-node",
    },
  },
  {
    selector: `edge[sourceArrow="none"]`,
    style: {
      "source-arrow-shape": "none",
    },
  },
  {
    selector: `edge[targetArrow="none"]`,
    style: {
      "target-arrow-shape": "none",
    },
  },
  {
    selector: `node[entity.type="Justification"]`,
    style: {
      shape: "ellipse",
      width: "10px",
      height: "10px",
    },
  },
  {
    selector: `node[entity.type="Justification"][polarity="Positive"]`,
    style: {
      "background-color": nephritis,
    },
  },
  {
    selector: `node[entity.type="Justification"][polarity="Negative"]`,
    style: {
      "background-color": pomegranate,
    },
  },
  {
    selector: `node[entity.type="Justification"][polarity="Positive"]:selected, node[entity.type="Justification"][polarity="Negative"]:selected`,
    style: {
      "background-color": sunflower,
    },
  },
  {
    selector: `edge[polarity="Positive"]`,
    style: {
      width: 2,
      "line-color": nephritis,
      "source-arrow-color": nephritis,
      "target-arrow-color": nephritis,
    },
  },
  {
    selector: `edge[polarity="Negative"]`,
    style: {
      width: 2,
      "line-color": pomegranate,
      "source-arrow-color": pomegranate,
      "target-arrow-color": pomegranate,
    },
  },
  {
    // Include the polarity to have greater precedence.
    selector: `edge[polarity="Positive"]:selected, edge[polarity="Negative"]:selected`,
    style: {
      "line-color": sunflower,
      "source-arrow-color": sunflower,
      "target-arrow-color": sunflower,
      width: 4,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": sunflower,
    },
  },
  {
    selector: `.dragging[entity.type="Justification"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: `.dragging[entity.type="PropositionCompound"]`,
    style: {
      opacity: 0.5,
    },
  },
  {
    selector: "node.hover-highlight",
    style: {
      "border-width": 3,
      "border-color": carrot,
    },
  },
  {
    selector: "edge.hover-highlight",
    style: {
      "line-color": carrot,
      "target-arrow-color": carrot,
      width: 4,
    },
  },
  {
    selector: ".remotely-selected",
    style: {
      "border-width": 3,
      "border-color": peterRiver,
      "border-style": "dashed",
    },
  },
];
