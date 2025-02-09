import type { Logger } from "../logger.js";
import { getPreviousLeafNode, isTextNode, nodeIsBefore } from "./dom.js";

export function normalizeRange(range: Range, logger: Logger) {
  // Some ranges end at the beginning of a node that is after the start node,
  // but conceptually are meant to include up to the end of the node before the
  // end node.
  //
  // An example is triple-clicking a paragraph in a web browser. This action
  // creates a selection with a range that ends at the beginning of the
  // following paragraph. But the user wanted to select only the paragraph they
  // triple clicked. Using our anchor libraries with such ranges will include
  // the entire following paragraph, which is not what we want.
  //
  // So update these ranges to move the end back to the end of that previous
  // node.
  if (
    range.endOffset === 0 &&
    nodeIsBefore(range.startContainer, range.endContainer)
  ) {
    const node = getPreviousLeafNode(range.endContainer);
    if (!node) {
      logger.warn(
        "Unable to set a range's end because we got no previous leaf node. Skipping this range.",
      );
      return;
    }

    const length = isTextNode(node) ? node.length : node.childNodes.length;
    range.setEnd(node, length);
  }
}
