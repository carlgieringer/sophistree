# Sophistree requirements

I'm working on a browser extension called Sophistree.

The goal is to map arguments in a sidebar. In the main view is a web page which is the source of the argument(s).

Requirements for the extension overall:

- Cross-browser, supporting at least Firefox and Chrome desktop browsers.

The features of the mapping sidebar are:

- Nodes of type: Proposition, Justification, and MediaExcerpt
- Justifications must have at least one edge targeting either a Proposition node or another Justification's edge.
- Justifications have a basis that is the substance of the Justification. A basis is either one or more Propositions (a Proposition compound) or a MediaExcerpt.
- Justifications can target a proposition inside another Justification's basis.
- A MediaExcerpt is a quotation, a URL, and source name (e.g. article citation.)
- A Justification targeting another Justification's edge is a counter justification.
- Proposition and Justification nodes have zero or more "Appearances".
- An Appearance is a MediaExcerpt.
- A MediaExcerpt has an icon (e.g. a magnifying glass) next to it and clicking on this navigates the main view to the URL if it is not already there, scrolls to the quotation, and selects the quotation highlight by adding an extra border around its highlight.
- Automatically layout all the nodes in a top-to-bottom format. If nodes are not connected to any others, then lay them out in a cluster to the left-hand side of the connected tree. If there are multiple disconnected trees, lay them out next to each other.
- Animate movement of the nodes.
- Use persistent identifiers for the DOM nodes so that they are animated when they move.
- Provide "+" buttons for: 1) adding a new Justification targeting a Proposition. 2) adding a new Proposition that a current Justification targets, 3) for adding a new counter Justification to an existing Justification.

The features of the main browser view are:

- A right click context menu "+ Sophistree" that is only active for selected text. It creates a new MediaExcerpt node in the mapping pane with the selected text as the quotation, the web page's URL as its URL, and either the value of meta[property="og:title]
- All of the Appearances from the mapping pane appear as highlights. Because Appearances can overlap, the highlights must be able to overlap also, and must get darker in color according to the number of overlapping highlights.
- Clicking on a highlight selects the node(s) having Appearances corresponding to that highlight

We have already created the basic structure of the extension and the graph view.

Is there anything I should clarify or any questions you need answered to create this browser
extension? Above I have used THE_EXT to refer to the extension. Can you also suggest a good name for
this extension and use that in place of Sophistree?

TODO:

- Counter justification intermediate nodes
- Node list for disconnected nodes? (Filter by all nodes and disconnected?)
  - Propositions, MediaExcerpts
- Collapsing

- Support setting Justification polarity via drag.
  - https://github.com/cytoscape/cytoscape.js-popper for polarity targets?
- Message origin checks
- Retrieve MediaExcerpts from background scripts instead of sidebar?
- Voting?
