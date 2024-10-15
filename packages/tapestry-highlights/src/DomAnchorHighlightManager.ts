import {
  HighlightManager,
  HighlightManagerOptions,
  HighlightHandlers,
  Highlight,
} from "./HighlightManager";

import {
  DomAnchor,
  makeDomAnchorFromRange,
  makeDomAnchorFromSelection,
  getRangesFromDomAnchor,
} from "./anchors";

export type DomAnchorHighlightManagerOptions<Data> = Omit<
  HighlightManagerOptions<DomAnchor, Data>,
  "getRangesFromAnchor"
>;

/** A HighlightManager with a predetermined Anchor type. */
export class DomAnchorHighlightManager<Data> extends HighlightManager<
  DomAnchor,
  Data
> {
  constructor(options: DomAnchorHighlightManagerOptions<Data>) {
    super({
      ...options,
      getRangesFromAnchor: (anchor: DomAnchor) =>
        getRangesFromDomAnchor(options.container, anchor),
    });
  }

  createHighlightFromCurrentSelection(
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<DomAnchor, Data> {
    const selection = window.getSelection();
    if (!selection) {
      throw new Error(
        "Cannot create highlight from current selection because there isn't one.",
      );
    }
    return this.createHighlightFromSelection(selection, data, handlers);
  }

  createHighlightFromSelection(
    selection: Selection,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<DomAnchor, Data> {
    if (!selection || selection.isCollapsed) {
      throw new Error("Cannot highlight empty selection.");
    }
    const domAnchor = makeDomAnchorFromSelection(selection);
    return this.createHighlight(domAnchor, data, handlers);
  }

  createHighlightFromRange(
    range: Range,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Highlight<DomAnchor, Data> {
    const domAnchor = makeDomAnchorFromRange(range);
    return this.createHighlight(domAnchor, data, handlers);
  }
}
