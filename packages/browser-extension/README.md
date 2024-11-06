# Sophistree Browser Extension

Sophistree is a
[Chrome
extension](https://chromewebstore.google.com/detail/sophistree/mjcdfjnpgilfkhnolcjellbknlehekem?pli=1)
for mapping arguments.

![screenshot](https://github.com/carlgieringer/sophistree/blob/main/packages/browser-extension/docs/screenshot.png?raw=true)

See [Features.md](https://github.com/carlgieringer/sophistree/blob/main/packages/browser-extension/docs/Features.md) for a list
of CUJs.

## Development Setup

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/carlgieringer/sophistree.git
   cd sophistree
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

## Development Workflow

### Running development build

This continuously builds the javascript:

```sh
npm run build-dev-watch
```

This will build the javascript and watch for changes. Changes to static files
in public don't trigger changes, but are picked up when the JS changes.

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `dist/dev` folder created in the previous step.

To reload JS changes, you can just close and re-open the sidebar using the action button in Chrome's
toolbar.

You'll need to reload the extension any time the manifest or content scripts
change. You can do this from the in-app menu or from Chrome's extension page.

### Running Tests

```sh
npm run test
```

### Debugging tests

```sh
npm run test-debug
```

#### Debugging a specific test

```sh
npm run test-debug -- <suitePattern> --testNamePattern="'<testPattern>'"
```

Where `<suitePattern>` matches the test file name and `<testPattern>` matches the `describe` and/or
`test`. You can use `<suitePattern>` and `<testPattern>` indepenently.

### Running all CI checks

```sh
npm run check-all
```

## Using the extension

- Select text on a page and there will be a context menu item that creates a MediaExcerpt.
- Click a highlight on a page to select the MediaExcerpt and any Appearances in the graph.
- Double click on the graph to create a new Proposition (select it to edit its text.)
- Everthing else is drag-and-drop:
  - Drag a Proposition to a MediaExcerpt to say "the Proposition appears
    at that MediaExcerpt". The MediaExcerpt will then be hidden by default, but you can
    show it using the table.
  - Drag a Proposition or MediaExcerpt to a Proposition to create a
    Justification.
  - Drag a Proposition to a PropositionCompound (wrapper around Proposition(s) already
    in a Justification) to combine the Propositions into a Justification basis.

Due to an apparent limitation of Chrome extension sidebars, pinch-to-zoom does not work on the
graph. Use command-/control- scroll to zoom.

See [Features.md](https://github.com/carlgieringer/sophistree/blob/main/packages/browser-extension/docs/Features.md) for a list
of CUJs.

The model is the same as Howdju, and is explained here with a graph:
https://docs.howdju.com/concepts

## PDF support

Sophistree supports highlighting PDFs by:

- Including PDF.js's embedded PDF viewer page, modified to inject our content script into the page.
- Detecting PDF files and redirecting to the embedded PDF viewer page.
- Supporting highlights on the PDF viewer page with `tapestry-highlight`'s `PdfJsAnchorHighlightManager`.

Note that the PDF support is currently very basic, only detecting PDFs with a `".pdf"` extension. If
you encounter issues, please report them using Github's issues.

### Updating PDF.js

Pick a release from [available releases](https://github.com/mozilla/pdf.js/releases).

```sh
 npm run update-pdfjs -- https://github.com/mozilla/pdf.js/releases/download/v4.7.76/pdfjs-4.7.76-dist.zip
```

## Extension components and permissions

This section briefly describes why the extensions requires certain scripts and permissions:

- `scripting` & `host_permissions`: `<all_urls>`: required for highlighting functionality to work on
  pages that are open when the extension is installed
- `service_worker`:
  - The service worker script installs the content scripts when the extension is installed
    (otherwise the user must reload all pages before highlighting will work.)
  - Installs and responds to context menu items
- `content_scripts`:

  - The content script manages highlights and interacts with the sidebar to create excerpts and to
    emphasize focused exerpts.
  - `<all_urls>` so that Sophistree works on all pages

- `webNavigation`: allows the extension to detect PDF files and redirect to a PDF viewer that supports
  highlighting.

## Publishing to Chrome Web Store

Ensure the versions in `manifest.json` and `package.json` are up-to-date.

```sh
npm run build-prod
npm run zip-extension
```

Upload the zip file.
