/**
 * A custom hierarchival Cytoscape layout supporting basic compoundness.
 *
 *  - Nodes are arranged top-to-bottom according, with nodes that are the targets of others at the top.
 *  - Nodes that are only targets and not the source of an edge are at the very top.
 *  - The layout supports a limited amount of compoundness: nodes that have parents will never be
 *    the source of edges. Instead, nodes that have parents must be layed out horiztonally within
 *    their parent.
 *  - Users will be able to drag nodes that are children in a compound to adjust their horizontal
 *    order only.
 */

import cytoscape from "cytoscape";

export interface SophistreeLayoutOptions {
  name: "sophistree";
  fit?: boolean;
  padding?: number;
  spacingFactor?: number;
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  // Required by Cytoscape
  cy: cytoscape.Core;
  eles: cytoscape.Collection;
}

export class SophistreeLayout {
  public options: SophistreeLayoutOptions;
  private cy: cytoscape.Core;
  private eles: cytoscape.Collection;
  private layers: cytoscape.NodeCollection[];
  private listeners: { [key: string]: (() => void)[] };

  constructor(options: SophistreeLayoutOptions) {
    const defaults = {
      fit: true,
      padding: 30,
      spacingFactor: 1.5,
      animate: false,
      animationDuration: 500,
      animationEasing: "ease-out" as const,
    };

    this.options = { ...defaults, ...options };
    this.cy = options.cy;
    this.eles = options.eles;
    this.layers = [];
    this.listeners = {};
  }

  one(event: string, callback: () => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string): void {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach((callback) => callback());
    this.listeners[event] = []; // Clear after emitting since these are one-time listeners
  }

  run(): this {
    const nodes = this.eles.nodes();
    const edges = this.eles.edges();

    // Step 1: Identify root nodes (no outgoing edges, not compound children)
    const rootNodes = nodes.filter((node: cytoscape.NodeSingular) => {
      return (
        !node.isChild() &&
        edges.filter((e) => e.source().id() === node.id()).empty()
      );
    });

    // Step 2: Create layers starting with root nodes
    this.layers = [rootNodes];
    const processedNodes = new Set<string>();
    rootNodes.forEach((node: cytoscape.NodeSingular) => {
      processedNodes.add(node.id());
    });

    // Keep processing until all nodes are assigned to layers
    while (processedNodes.size < nodes.length) {
      const nextLayer = nodes.filter((node: cytoscape.NodeSingular) => {
        if (processedNodes.has(node.id())) return false;

        // A node can be in the next layer if all its targets are in previous layers
        const outgoingEdges = edges.filter(
          (e: cytoscape.EdgeSingular) => e.source().id() === node.id(),
        );
        const targetNodeIds = outgoingEdges.map((e: cytoscape.EdgeSingular) => {
          return e.target().id();
        });
        return targetNodeIds.every((targetId) => processedNodes.has(targetId));
      });

      if (nextLayer.empty()) break; // Prevent infinite loops

      this.layers.push(nextLayer);
      nextLayer.forEach((node: cytoscape.NodeSingular) => {
        processedNodes.add(node.id());
      });
    }

    // Step 3: Calculate positions using layoutPositions and actual node dimensions
    const container = this.cy.container();
    if (!container) {
      throw new Error("No container found for Cytoscape instance");
    }
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;

    // Use larger fractions of container size for spacing
    const horizontalSpacing =
      containerWidth * 0.2 * (this.options.spacingFactor || 1);
    const positions = new Map<string, { x: number; y: number }>();
    const dimensions = new Map<string, { width: number; height: number }>();

    // Get dimensions for all nodes
    nodes.forEach((node: cytoscape.NodeSingular) => {
      const bb = node.boundingBox();
      dimensions.set(node.id(), {
        width: bb.w,
        height: bb.h,
      });
    });

    // Calculate layer heights based on tallest node in each layer, with spacing factor
    const verticalSpacing =
      containerHeight * 1 * (this.options.spacingFactor || 1);
    const layerHeights = this.layers.map((layer) => {
      const maxHeight = Math.max(
        ...layer.map((node) => dimensions.get(node.id())?.height || 0),
      );
      return maxHeight + verticalSpacing; // Add spacing between layers
    });

    // Calculate cumulative Y positions for each layer
    const layerY = layerHeights.reduce(
      (acc, height, i) => {
        acc[i] = i === 0 ? 0 : acc[i - 1] + height;
        return acc;
      },
      {} as { [key: number]: number },
    );

    // Calculate positions for all nodes
    this.layers.forEach((layer, layerIndex) => {
      const y = layerY[layerIndex];

      layer.forEach((node, nodeIndex) => {
        const nodeDim = dimensions.get(node.id()) || { width: 0, height: 0 };

        if (node.isChild()) {
          // Handle compound children - arrange horizontally within parent
          const parent = node.parent();
          const siblings = parent.children();

          // Calculate total width including spacing
          const siblingWidths = siblings.map(
            (sibling) => dimensions.get(sibling.id())?.width || 0,
          );
          const totalWidth = siblingWidths.reduce(
            (sum, width) => sum + width + horizontalSpacing,
            -horizontalSpacing,
          );

          // Calculate starting X position
          let startX = -totalWidth / 2;

          // Sort siblings by ID for default ordering
          const siblingArray = siblings.toArray();
          siblingArray.sort((a, b) => a.id().localeCompare(b.id()));

          // Calculate X position based on preceding siblings
          const siblingIndex = siblingArray.indexOf(node);
          for (let i = 0; i < siblingIndex; i++) {
            const sibWidth = dimensions.get(siblingArray[i].id())?.width || 0;
            startX += sibWidth + horizontalSpacing;
          }

          positions.set(node.id(), {
            x: startX + nodeDim.width / 2,
            y: 0, // Relative to parent
          });
        } else {
          // Position regular nodes
          // Calculate total width of the layer
          const layerWidths = layer.map(
            (n) => dimensions.get(n.id())?.width || 0,
          );
          const totalLayerWidth = layerWidths.reduce(
            (sum, width) => sum + width + horizontalSpacing,
            -horizontalSpacing,
          );

          // Calculate starting X position
          let x = -totalLayerWidth / 2;

          // Add width of preceding nodes in layer
          for (let i = 0; i < nodeIndex; i++) {
            const prevWidth = dimensions.get(layer[i].id())?.width || 0;
            x += prevWidth + horizontalSpacing;
          }

          positions.set(node.id(), {
            x: x + nodeDim.width / 2,
            y,
          });
        }
      });
    });

    console.log(positions);

    const positionNodes = () => {
      nodes.layoutPositions(
        // @ts-expect-error Type 'SophistreeLayout' is not assignable to type 'string'.
        this,
        this.options,
        (node: cytoscape.NodeSingular) => {
          const pos = positions.get(node.id());
          return pos || { x: 0, y: 0 }; // Fallback position if not found
        },
      );

      if (this.options.fit) {
        this.cy.fit(undefined, this.options.padding);
      }

      this.emit("layoutstop");
    };

    if (this.options.animate) {
      // Queue the positioning for next tick to ensure proper animation
      setTimeout(positionNodes, 0);
    } else {
      positionNodes();
    }

    return this;
  }

  stop(): this {
    // Cancel any running animations
    this.cy.nodes().stop();
    return this;
  }

  destroy(): this {
    return this;
  }
}

type SophistreeLayoutConstructor = (options: SophistreeLayoutOptions) => void;

interface SophistreeLayoutInterface extends SophistreeLayoutConstructor {
  layout: SophistreeLayout;
  run: () => SophistreeLayoutInterface;
}

// Create and export the extension registration function
export default function register(cs: typeof cytoscape) {
  function sophistreeLayoutInterface(
    this: SophistreeLayoutInterface,
    options: SophistreeLayoutOptions,
  ) {
    this.layout = new SophistreeLayout(options);
  }
  (sophistreeLayoutInterface.prototype as SophistreeLayoutInterface).run =
    function (this: SophistreeLayoutInterface) {
      this.layout.run();
      return this;
    };
  cs("layout", "sophistree", sophistreeLayoutInterface);
}
