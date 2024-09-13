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

#### Running development build

```sh
npm run build:dev
```

#### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `dist` folder created in the previous step.

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

## Contributing

[Include information about how to contribute to the project, coding standards, pull request process, etc.]

## License

[Include license information here]
