import { DomAnchorHighlightManager } from "./DomAnchorHighlightManager.js";
import {
  type HighlightHandlers,
  type Highlight,
  type HighlightSelector,
} from "./HighlightManager.js";
import { type DomAnchor } from "./anchors/index.js";

/** A class providing access to a promised DomAnchorHighlightManager via async methods. */
export class AsyncDomAnchorHighlightManager<Data> {
  private readonly wrappedManagerPromise: Promise<
    DomAnchorHighlightManager<Data>
  >;

  constructor(wrappedManagerPromise: Promise<DomAnchorHighlightManager<Data>>) {
    this.wrappedManagerPromise = wrappedManagerPromise;
  }

  async createHighlightFromCurrentSelection(
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Promise<Highlight<DomAnchor, Data>> {
    const manager = await this.wrappedManagerPromise;
    return manager.createHighlightFromCurrentSelection(data, handlers);
  }

  async createHighlightFromSelection(
    selection: Selection,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Promise<Highlight<DomAnchor, Data>> {
    const manager = await this.wrappedManagerPromise;
    return manager.createHighlightFromSelection(selection, data, handlers);
  }

  async createHighlightFromRange(
    range: Range,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ): Promise<Highlight<DomAnchor, Data>> {
    const manager = await this.wrappedManagerPromise;
    return manager.createHighlightFromRange(range, data, handlers);
  }

  async removeAllHighlights() {
    const manager = await this.wrappedManagerPromise;
    manager.removeAllHighlights();
  }

  async removeHighlights(selector: HighlightSelector<Data>) {
    const manager = await this.wrappedManagerPromise;
    manager.removeHighlights(selector);
  }

  async removeHighlight(highlight: Highlight<DomAnchor, Data>) {
    const manager = await this.wrappedManagerPromise;
    manager.removeHighlight(highlight);
  }

  async focusHighlight(selector: HighlightSelector<Data>) {
    const manager = await this.wrappedManagerPromise;
    manager.focusHighlight(selector);
  }

  async createHighlight(
    anchor: DomAnchor,
    data: Data,
    handlers?: HighlightHandlers<Data>,
  ) {
    const manager = await this.wrappedManagerPromise;
    manager.createHighlight(anchor, data, handlers);
  }

  async updateHighlightsClassNames(selector: HighlightSelector<Data>) {
    const manager = await this.wrappedManagerPromise;
    manager.updateHighlightsClassNames(selector);
  }
}
