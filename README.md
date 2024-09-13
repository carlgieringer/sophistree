# Sophistree Browser Extension

Sophistree is a browser extension for mapping arguments, built with React, Redux, and TypeScript.

## Development Setup

### Prerequisites

- Node.js (v14 or later recommended)
- npm (comes with Node.js)
- A Chromium-based browser (e.g., Google Chrome, Microsoft Edge)

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/your-username/sophistree-extension.git
   cd sophistree-extension
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

### Development Workflow

#### Running the Development Server

1. Start the Vite development server:

   ```sh
   npm run dev
   ```

   This will start the server at `http://localhost:3000`.

2. In a separate terminal, build the development version of the extension:

   ```sh
   npm run build:dev
   ```

   This creates a `dist` folder with the development version of the extension.

#### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `dist` folder created in the previous step.

#### Development with Hot Module Replacement (HMR)

With the above setup, you can now edit the React components in the `src` folder. Changes will be immediately reflected in the browser thanks to HMR.

Note: Changes to background scripts, content scripts, or the manifest file require you to rebuild the extension and reload it in the browser.

### Building for Production

To create a production build of the extension:

```sh
npm run build
```

This will create a production-ready version of the extension in the `dist` folder.

### Project Structure

- `src/`: Contains the React application and TypeScript source files
- `public/`: Contains static assets and manifest files
- `dist/`: Contains the built extension (created after running build scripts)

### Available Scripts

- `npm run dev`: Starts the Vite development server
- `npm run build:dev`: Builds the development version of the extension
- `npm run build`: Builds the production version of the extension
- `npm run type-check`: Runs TypeScript type checking
- `npm run preview`: Previews the built extension

## Contributing

[Include information about how to contribute to the project, coding standards, pull request process, etc.]

## License

[Include license information here]
