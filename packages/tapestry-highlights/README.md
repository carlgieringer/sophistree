# `tapestry-highlights`

`tapestry-highlights` is a browser highlighting library that supports overlapping highlights. It
is currently used in the [Sophistree Chrome
extension](https://chromewebstore.google.com/detail/sophistree/mjcdfjnpgilfkhnolcjellbknlehekem).

As a library, the intentions are to be:

- Non-intrusive: highlights overlap but don't directly modify the content they are highlighting.
- Performant: able to handle hundreds of highlights on a single page.
- Extensible: providing extension points for end-user provided functionality.

## Features overview

- Scrolling to highlights
- Durable anchoring that restores highlights after window resizing.
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
// If using built-in colors
import "tapestry-highlights/rotation-colors.css";

interface MyData {
  someId: string;
  someOtherData: string;
}

// Create a new highlight manager
const highlightManager = new DomAnchorHighlightManager<MyData>({
  container: document.body,
  colors: {
    mode: "rotate",
    count: 5,
  },
});

// Create a highlight from the window's current selection
const highlight = highlightManager.createHighlightFromCurrentSelection(
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

// Create a highlight from a specific range
const range: Range = getSomeRange();
const rangeHighlight = highlightManager.createHighlightFromRange(range, {
  someId: "app-specific-id-2",
  someOtherData: "Range highlight data",
});

// Create a highlight based on a persisted anchor
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

#### Callback-based highlight classes

`HighlightManager` can add classes to highlights based on a callback you provide:

```ts
const highlightManager = new DomAnchorHighlightManager({
  container: document.body,
  colors: {
    mode: "class-callback",
    getHighlightClass: (data) => {
      // Return a class based on the highlight data
      return `highlight-color-${data.type}`;
    },
  },
});
```

This is useful for providing custom colors and logic, but technically you
can use it however you want.

#### Updating highlight classes

You must notify the manager to update the color of existing highlights:

```ts
// Some code providing idNeedingUpdate ...

highlightManager.updateHighlightClassesMatching((highlight) => {
  // Update highlights that match a certain condition
  return highlight.data["someId"] === idNeedingUpdate;
});
```

#### Focusing a Highlight

To scroll to and focus a specific highlight:

```ts
highlightManager.focusHighlight(
  (highlight) => highlight.data["id"] === "unique-id-1",
);
```

### Custom colors

Instead of importing `rotation-colors.css` you can provide your own. Provide
classes for `.highlight-color-x` where `x` is the 0-based number of highlights
you will pass to the constructor's `count`.

```css
.highlight-color-0 {
  background-color: rgba(255, 245, 180, 0.4);
  border-color: rgba(255, 218, 151, 0.6);
}

.highlight-color-0.highlight-hover {
  background-color: rgba(255, 215, 0, 0.5);
  border-color: rgba(255, 215, 0, 0.5);
}

...
```

### Custom anchor types

`DomAnchorHighlightManager<Data>` is a subclass of `HighlightManager<Anchor, Data>` where
`Anchor` is `DomAnchor`. `DomAnchor` is an anchor type that conservatively contains three
different methods for selecting ranges:

- [text-fragments-polyfill](https://www.npmjs.com/package/text-fragments-polyfill)
- [dom-anchor-text-position](https://www.npmjs.com/package/dom-anchor-text-position)
- [dom-anchor-text-quote](https://www.npmjs.com/package/dom-anchor-text-quote)

In TypeScript this is like:

```ts
import * as textPosition from "dom-anchor-text-position";
import * as textQuote from "dom-anchor-text-quote";
import type { TextFragment } from "text-fragments-polyfill/dist/fragment-generation-utils.js";

export interface DomAnchor {
  fragment?: TextFragment;
  text: textQuote.TextQuoteAnchor;
  position: textPosition.TextPositionAnchor;
}
```

But applications may use different anchoring technology. In that case you can use
`HighlightManager` directly, providing an additional constructor option `getRangesFromAnchor`:

```ts
// Create a new highlight manager
const highlightManager = new HighlightManager<MyAnchor, MyData>({
  container: document.body,
  getRangesFromAnchor: (anchor: DomAnchor) => {
    // ... custom logic returning ranges
  },
  colors: {
    mode: "rotate",
    count: 5,
  },
});

// Create a highlight based on an anchor
highlightManager.createHighlight(anchor, data);
```

## Design overview

TODO

## Development

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
