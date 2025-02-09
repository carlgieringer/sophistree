import type { Logger } from "../logger.js";

export function nodeIsBefore(node1: Node, node2: Node) {
  return nodePositionCompare(node1, node2) < 0;
}

/**
 * Returns a number comparing the position of node1 to node2.
 *
 * There are five possibilities, and these are the return values:
 *
 * 1. The nodes are the same node (0)
 * 2. node1 contains node2 (-1 because node1 starts before node2 starts)
 * 3. node2 contains node1 (1 because node1 starts after node2 starts)
 * 4. node1 ends before node2 starts (-1)
 * 5. node1 begins after node2 ends (1)
 *
 * @returns -1 is node1 is before node2, 0 if they are the same node, and 1 if node1 is after node2.
 */
export function nodePositionCompare(node1: Node, node2: Node) {
  if (node1 === node2) {
    return 0;
  } else if (node1.contains(node2)) {
    return -1;
  } else if (node2.contains(node1)) {
    return 1;
  }

  // Get the two ancestors that are children of the common ancestor and contain each the two nodes.
  let ancestor1 = node1;
  while (ancestor1.parentNode && !ancestor1.parentNode.contains(node2)) {
    ancestor1 = ancestor1.parentNode;
  }

  let ancestor2 = node2;
  while (
    ancestor2.parentNode &&
    ancestor2.parentNode !== ancestor1.parentNode
  ) {
    ancestor2 = ancestor2.parentNode;
  }

  let sibling = ancestor1.nextSibling;
  // if ancestor2 is later in the sibling chain than ancestor1, then node1 comes before node2
  while (sibling) {
    if (sibling === ancestor2) return -1;
    sibling = sibling.nextSibling;
  }
  // otherwise node2 comes before node1
  return 1;
}

export function getPreviousLeafNode(node: Node, logger: Logger = console): Node | undefined {
  if (!node) {
    return undefined;
  }

  // If the node has children, start with its first child
  let prevLeafNode = node.childNodes.length && node.firstChild ? node.firstChild : node;

  // If we're at a non-leaf node, traverse to its last descendant
  while (prevLeafNode && prevLeafNode.childNodes.length > 0) {
    const lastChildIndex: number = prevLeafNode.childNodes.length - 1;
    const lastChild = prevLeafNode.childNodes[lastChildIndex];
    if (!lastChild) break;
    prevLeafNode = lastChild;
  }

  if (!prevLeafNode) {
    return undefined;
  }

  // If we're already at a leaf node, find the previous one
  const previousSibling = prevLeafNode.previousSibling;
  if (!previousSibling) {
    // Go up until we find a parent with a previous sibling
    let current: Node | null = prevLeafNode;
    while (current && current.parentNode && !current.previousSibling) {
      current = current.parentNode;
    }

    if (!current || !current.previousSibling) {
      logger.error(
        "Unable to return previous leaf node because we exhausted parents while looking for a previous sibling.",
      );
      return undefined;
    }

    // Found a previous sibling, now traverse to its last descendant
    prevLeafNode = current.previousSibling;
    while (prevLeafNode && prevLeafNode.childNodes.length > 0) {
      const lastChildIndex: number = prevLeafNode.childNodes.length - 1;
      const lastChild: Node | null = prevLeafNode.childNodes[lastChildIndex] || null;
      if (!lastChild) break;
      prevLeafNode = lastChild;
    }
  } else {
    prevLeafNode = previousSibling;
    // Traverse to last descendant of the previous sibling
    while (prevLeafNode && prevLeafNode.childNodes.length > 0) {
      const lastChildIndex: number = prevLeafNode.childNodes.length - 1;
      const lastChild: Node | null = prevLeafNode.childNodes[lastChildIndex] || null;
      if (!lastChild) break;
      prevLeafNode = lastChild;
    }
  }

  if (!prevLeafNode) {
    return undefined;
  }

  // Skip empty text nodes
  if (isEmptyTextNode(prevLeafNode)) {
    const nextPrev: Node | undefined = getPreviousLeafNode(prevLeafNode, logger);
    if (!nextPrev) {
      return undefined;
    }
    prevLeafNode = nextPrev;
  }

  return prevLeafNode;
}

function isEmptyTextNode(node: Node | undefined): node is Text {
  return !!node && isTextNode(node) && /^\s*$/.test(node.textContent || "");
}

export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}
