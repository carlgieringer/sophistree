# `tapestry-highlights`

`tapestry-highlights` ([npm](https://www.npmjs.com/package/tapestry-highlights)) is a browser
highlighting library that supports overlapping highlights. It is currently used in the [Sophistree
Chrome extension](https://chromewebstore.google.com/detail/sophistree/mjcdfjnpgilfkhnolcjellbknlehekem).

As a library, the intentions are to be:

- Non-intrusive: highlights overlap but don't directly modify the content they are highlighting.
- Performant: able to handle hundreds of highlights on a single page.
- Extensible: providing extension points for end-user provided functionality.

## Features overview

- Scrolling to highlights
- Durable anchoring that restores highlights after window resizing.
- Highlights update for dynamic content that is added/removed from the page.
- Configurable coloring

## Versioning

Because it is a new library with limited usage, its API is subject to change prior to a 1.0 release.
After that time it will follow semantic versioning (major upgrades for breaking changes.)

## Usage

### Installation

```sh
npm install tapestry-highlights
```

### Basic Usage

Here's a basic example of how to use the `DomAnchorHighlightManager`:

```ts
import { DomAnchorHighlightManager } from "tapestry-highlights";
import "tapestry-highlights/rotation-colors.css";

// App-specific data; not introspected by taptestry-highlights
interface MyData {
  someId: string;
  someOtherData: string;
}

const highlightManager = new DomAnchorHighlightManager<MyData>({
  container: document.body,
});

const highlight = highlightManager.createHighlightFromCurrentSelection(
  // This data is opaque to tapestry-highlights
  {
    someId: "app-specific-id-1",
    someOtherData: "Some associated data",
  },
  // Optional handlers
  {
    onClick: (highlight) => {
      console.log("Highlight clicked:", highlight.data);
    },
  },
);
const { data, anchor } = highlight;

saveMyAnchorUsingMyData(data, anchor);

const range: Range = getSomeRange();
const rangeHighlight = highlightManager.createHighlightFromRange(range, {
  someId: "app-specific-id-2",
  someOtherData: "Range highlight data",
});

// Create a highlight based on a persisted anchor
const { data, anchor } = readTheDataAndAnchorBack();
highlightManager.createHighlight(anchor, data);

// Remove a highlight
highlightManager.removeHighlight(highlight);

// Remove all highlights
highlightManager.removeAllHighlights();
```

The data object you pass to the `create` methods is opaque to the manager; i.e.
you don't need to provide any identifier. This data is primarily so that you
can select the highlights in callbacks you pass to other manager methods.

### Advanced Usage

#### Highlighting PDFs

`tapestry-highlights` can highlight PDFs rendered by [PDF.js](https://mozilla.github.io/pdf.js/)
using the `PdfJsAnchorHighlightManager` class. This class encapsulates configuration and behavior
supporting PDF-specific behavior such as scrolling to a particular page of the PDF when focusing a
highlight.

Supporting PDF highlighting in a browser extension has multiple requirements. See
the [Sophistree extension's
README](https://github.com/carlgieringer/sophistree/blob/main/packages/browser-extension/README.md)
for more details on browser extension PDF support.

#### Custom highlight classes

By default, `HighlightManager` adds a class to highlights to color them using
the provided `rotation-colors.css`.

```ts
const highlightManager = new DomAnchorHighlightManager({
  container: document.body,
  getHighlightClassNames: (data, index) => {
    // Return a class based on the highlight data
    return [`highlight-color-${index % 5}`];
  },
});
```

You can override `getHighlightClassNames`
to provide additional class names or to customize your coloring according to
your data.

```ts
const highlightManager = new DomAnchorHighlightManager({
  container: document.body,
  getHighlightClassNames: (data, index) => {
    // Return a class based on the highlight data
    return getClassesForTheHightlight(data);
  },
});
```

#### Updating highlight classes

You must notify the manager to update the color of existing highlights:

```ts
// Some code providing idNeedingUpdate ...

highlightManager.updateHighlightClassNames((highlight) => {
  // Update highlights that match a certain condition
  return highlight.data["someId"] === idNeedingUpdate;
});
```

#### Focusing a Highlight

Focus a specific highlight (scroll and apply a focus class):

```ts
highlightManager.focusHighlight(
  (highlight) => highlight.data["id"] === "unique-id-1",
);
```

### Custom anchor types

`DomAnchorHighlightManager<Data>` is a subclass of `HighlightManager<Anchor, Data>` where
`Anchor` is `DomAnchor`. `DomAnchor` is an anchor type that conservatively contains two
different methods for selecting ranges:

- [text-fragments-polyfill](https://www.npmjs.com/package/text-fragments-polyfill)
- [dom-anchor-text-quote](https://www.npmjs.com/package/dom-anchor-text-quote)

In TypeScript this is like:

```ts
import * as textQuote from "dom-anchor-text-quote";
import type { TextFragment } from "text-fragments-polyfill/dist/fragment-generation-utils.js";

export interface DomAnchor {
  fragment?: TextFragment;
  text: textQuote.TextQuoteAnchor;
}
```

But applications may use different anchoring technology. In that case you can use
`HighlightManager` directly, providing an additional constructor option `getRangesFromAnchor`:

```ts
// Create a new highlight manager
const highlightManager = new HighlightManager<MyAnchor, MyData>({
  container: document.body,
  getRangesFromAnchor: (anchor: MyAnchor) => {
    // ... custom logic returning ranges
  },
});
```

## Implementation overview

Here are some key implementation details:

1. Highlight Representation:

   - Each highlight is associated with one or more `Range`s and one or more
     `HTMLElement`s necessary to cover the nodes appearing in the ranges.

2. Element Creation and Positioning:

   - These elements are positioned absolutely to match the bounding client rects of the nodes inside
     their ranges.
   - The manager updates these elements' positions when necessary (e.g., on window resize) to ensure
     they always cover the correct text.
   - The manager also reanchors a highlight on window resize in case the nodes
     in a range were removed from the page.

3. Layering and Z-Index:

   - Highlights are layered using z-index to handle overlapping highlights correctly.
   - The manager maintains a sorted list of highlight elements to determine the correct z-index for each element.

4. Event Handling:

   - Highlight elements are `pointer-events: none` by default to allow clicking on elements under
     the highlight.
   - The manager temporary applies `pointer-events: auto` during `mousemove` and `click` to
     determine whether a highlight is affected.

## Development

### Setup

Install Playwright:

```shell
npx playwright install
```

### Running tests

```sh
# Run all tests
npm run test
# Run specific tests
npm run test -- e2e/HighlightManager.spec.ts -g "should create a highlight"
# Run specific browsers
npm run test -- --project=chromium
```

### Debugging tests

```sh
npm run test-debug
```

To debug browser code (`page.evaluate`) code, you must add a `debugger` statement to the code, run
the following command, when the browser opens, open devtools (so that they will break upon reaching
the `debugger` statement), then start the tests from the Playwright window that also opened.

### Snapshots

By default `npm run test` ignores snapshots because developers local machines may produce different
screenshots. But in the CI check we run the snapshot tests against Linux. If you make changes that
affect the snapshot tests, you should update them (and confirm the changes look good.)

Running and updating the snapshot tests requires docker so that the snapshots are from Linux and
match our Github CI.

Test the snapshots:

```sh
npm run test-snapshots
```

If this fails, you can update them like:

```sh
npm run test-update-snapshots
```

Be sure to manually inspect them.

If your PR fails during the CI checks Github action, you can check the uploaded Playwright report
(you must navigate to the workflow run from Actions, not from the PR) where you can see failure
explanations e.g. screenshot diffs.

### Publishing

Ensure that the version in `package.json` is up-to-date.

#### Packaging

```sh
npm run package
```

#### Test it works

Install the archive directly in the extension:

```sh
npm install tapestry-highlights-*.tgz --workspace=../browser-extension
```

Then try running the extension.

(Undo the install like:)

```sh
npm install . --workspace=../browser-extension
```

#### Publish to npmjs

```sh
npm publish tapestry-highlights-x.y.z.tgz
```
