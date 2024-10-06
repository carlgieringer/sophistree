# Features

This document describes Sophistree's features.

## Background

Sophistree has four major components:

- The graph canvas: a two dimensional diagram of entities in the argument graph. Not all entities
  will be visible depending on the context.
- The entity list: a table listing all the entities. Users can control the visibility of hidden
  elements here.
- The entity editor: a view containing fields for editing the selected entity.
- The content page: this is the webpage in the active tab. Sophistree installs a content script and
  style to create highlights in this page.

## Entity creation

A user can:

- create a new Proposition by double-tapping the graph canvas
- create a new Excerpt by selecting text in the content page and adding to Sophistree from the
  context menu.
- add a proposition to a compound by dragging a proposition node into the compound node
- create a counter-justification by dragging the basis node onto the target justification's edge or
  (or node if the justification is already countered and has an intermediate node.)

Excerpt creation guidelines:

- The sidebar must be open to create a new excerpt. If the sidebar is not open, the user gets an
  error message when trying to crate a media excerpt.
- If excerpt creation fails, no highlight is created.
- There must be an active graph to create a new excerpt. Otherwise, the user gets an error message.

## Highlights

- Loading a content page while the sidebar is open with an active will apply highlights for all
  excerpts in the graph that came from this page.
- Hovering over a higlight will emphasize the highlight.
- [Future] closing the sidebar removes highlights from all pages.
- [Future] opening the sidebar with an active graph adds highlights to all pages.
- [Future] Activating a new graph replaces highlights from the previously active graph, if any, with
  highlights from the new graph in all pages.

Guidelines:

- Sophistree prefers matching excerpts to pages using the page's canonical URL, if any, and
  otherwise falls back to the full URL.

## Outcomes

- Highlights reflect outcomes
- Highlights update to reflect changed outcomes.

## Graph management

A user can:

- rename a map
- delete a graph (if any graph exists)
- create a new graph
- open an existing graph
- download a graph
- download all graphs
- import a graph by uploading a file containing a single graph
- import multiple graphs by uploading a file containing multiple graphs

…from the app menu.

Graph import guidelines:

- imported graphs do not overwrite existing graphs
- a graph file with an older format is automatically converted to the current format if possible.

## Selection

- Clicking on a highlight selects any excerpts and appearances using the highlight's excerpt. It
  also pans the graph to make the selected entities' elements visible if they are not already.
- Clicking a graph element (node or edge) selects the element's entity.
- Clicking on the graph canvas deselects all entities.
- Clicking an entity list row selects the row's entity.

Guidelines:

- When an entity is selected:
  - It's elements in the graph get a distinguishing outline.
  - It's row in the entity list gains a distinguishing color.
  - The node editor displays that entity's information

## Focusing excerpts

- Clicking on an excerpt's link focuses on the excerpt in the content page

Guidelines:

- If an excerpt's URL is not open in the active tab, a new tab is opened first
- The content page scrolls to put the focused excerpt in the center of the view
- The excerpt's highlight is temporarily visually emphasized to draw the user's attention to it.

## Extension lifecycle

- Excerpt creation from tabs that were already open when the extension is installed should succeed.

Data guidelines:

- Extension data is stored in browser local storage. Uninstalling the app deletes this data.

Guidelines for excerpt creation from already open tabs:

- The user must open the sidebar and activate a map first.
