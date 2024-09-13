# Sophistree Browser Extension

Sophistree is a browser extension for mapping arguments, built with React, Redux, and TypeScript.

## Development Setup

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

This continuously builds the javascript:

```sh
npm run build:dev
```

If you change the manifest you must restart this command.

#### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `dist` folder created in the previous step.

You'll need to reload the extension any time the code changes. I couldn't figure
out how to do hot reload in a Chrome extension (I got permissions errors I didn't
figure out how to fix.)

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
