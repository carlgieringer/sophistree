# Features

This document describes Sophistree's features.

## Background

Sophistree has four major components:

- The canvas: a two dimensional diagram of entities in the argument map. Not all entities
  will be visible depending on the context.
- The entity list: a table listing all the entities. Users can control the visibility of hidden
  elements here.
- The entity editor: a view containing fields for editing the selected entity.
- The content page: this is the webpage in the active tab. Sophistree installs a content script and
  style to create highlights in this page.

## Entity creation

A user can:

- create a new Proposition by double-tapping the canvas
- create a new Excerpt by selecting text in the content page and adding to Sophistree from the
  context menu.
- add a proposition to a compound by dragging a proposition node into the compound node
- create a counter-justification by dragging the basis node onto the target justification's edge or
  (or node if the justification is already countered and has an intermediate node.)

Excerpt creation guidelines:

- The sidebar must be open to create a new excerpt. If the sidebar is not open, the user gets an
  error message when trying to crate a media excerpt.
- If excerpt creation fails, no highlight is created.
- There must be an active map to create a new excerpt. Otherwise, the user gets an error message.

## Highlights

- Creating a new excerpt highlights the selected text
- Loading a content page while the sidebar is open with an active map will apply highlights for all
  excerpts in the map from this page.
- Hovering over a higlight will emphasize the highlight.
- Closing the sidebar removes highlights from all pages.
- Opening the sidebar with an active map adds highlights to all pages.
- Activating a new map replaces highlights from the previously active map, if any, with
  highlights from the new map in all pages.
- Deleting the last map removes highlights from the content pages.

Guidelines:

- Sophistree prefers matching excerpts to pages using the page's canonical URL, if any, and
  otherwise falls back to the full URL.

## Outcomes

- Node coloring updates to reflect outcomes.
- Edge style updates to reflect outcomes.
- Highlights reflect outcomes
- Highlights update to reflect changed outcomes.

## Map management

A user can:

- rename a map
- delete a map (if any map exists)
- create a new map
- open an existing map
- download a map
- download all maps
- import a map by uploading a file containing a single map
- import multiple maps by uploading a file containing multiple maps

…from the app menu.

Map import guidelines:

- imported maps do not overwrite existing maps
- a map file with an older format is automatically converted to the current format if possible.

## Selection

- Clicking on a highlight selects any excerpts and appearances using the highlight's excerpt. It
  also pans the canvas to make the selected entities' elements visible if they are not already.
- Clicking a canvas element (node or edge) selects the element's entity.
- Clicking on the canvas canvas deselects all entities.
- Clicking an entity list row selects the row's entity.

Guidelines:

- When an entity is selected:
  - It's elements in the canvas get a distinguishing outline.
  - It's row in the entity list gains a distinguishing color.
  - The node editor displays that entity's information

## Focusing excerpts

- Clicking on an excerpt's link focuses on the excerpt in the content page
- Clicking on an appearance's 'go' button focuses on the excerpt in the content page

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
