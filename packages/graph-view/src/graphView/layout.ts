export function getLayout(fit = false, animationDuration = 250) {
  return {
    name: "elk",
    fit,
    animate: true,
    animationDuration,
    // All options are available at http://www.eclipse.org/elk/reference.html
    //
    // 'org.eclipse.' can be dropped from the identifier. The subsequent identifier has to be used as property key in quotes.
    // E.g. for 'org.eclipse.elk.direction' use:
    // 'elk.direction'
    //
    // Enums use the name of the enum as string e.g. instead of Direction.DOWN use:
    // 'elk.direction': 'DOWN'
    //
    // The main field to set is `algorithm`, which controls which particular layout algorithm is used.
    // Example (downwards layered layout):
    elk: {
      algorithm: "layered",
      "elk.aspectRatio": "1.5",
      "elk.direction": "UP",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      // Make our DFS sorting control the node order.
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
      "elk.layered.crossingMinimization.greedySwitch.activation": "true",
      "elk.layered.crossingMinimization.greedySwitch.type": "TWO_SIDED",
      "elk.layered.crossingMinimization.greedySwitchHierarchical.type":
        "TWO_SIDED",
      "elk.layered.crossingMinimization.greedySwitchMaxIterations": "100",
      // Without this, parents seem to move when you add children to them
      // I.e. respects forceNodeModelOrder less.
      "elk.layered.crossingMinimization.semiInteractive": "true",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      "elk.spacing.nodeNode": "50",
    },
  };
}
