# Sophistree Browser Extension

Sophistree is a Chrome extension for mapping arguments.

![screenshot](https://github.com/carlgieringer/sophistree/blob/main/docs/screenshot.png?raw=true)

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

### Development Workflow

#### Running development build

This continuously builds the javascript:

```sh
npm run build:dev
```

This will build the javascript and watch for changes. Changes to static files
in public don't trigger changes, but are picked up when the JS changes.

#### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `dist` folder created in the previous step.

To reload JS changes, you can just close and re-open the sidebar using the action button in Chrome's
toolbar.

You'll need to reload the extension any time the manifest changes. You can do this from the in-app
menu or from Chrome's extension page.
