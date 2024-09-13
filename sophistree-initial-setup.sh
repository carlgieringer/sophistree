#!/bin/bash

# Create the project directory
# mkdir sophistree-extension
# cd sophistree-extension

# Initialize npm project
npm init -y

# Install dependencies
npm install react react-dom
npm install -D vite @vitejs/plugin-react @types/react @types/react-dom

# Create necessary directories
mkdir src public

# Create basic files
touch src/index.html src/index.tsx src/App.tsx
touch public/manifest.json
touch vite.config.ts

# Set up Vite configuration
cat << EOF > vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'src/index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})
EOF

# Set up manifest.json
cat << EOF > public/manifest.json
{
  "manifest_version": 3,
  "name": "Sophistree",
  "version": "1.0",
  "description": "A browser extension for mapping arguments",
  "permissions": ["activeTab", "storage"],
  "action": {
    "default_popup": "index.html",
    "default_title": "Sophistree"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "side_panel": {
    "default_path": "index.html"
  }
}
EOF

# Set up index.html
cat << EOF > src/index.html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sophistree</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
</body>
</html>
EOF

# Set up index.tsx
cat << EOF > src/index.tsx
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
EOF

# Set up App.tsx
cat << EOF > src/App.tsx
import React from 'react'

const App: React.FC = () => {
  return (
    <div>
      <h1>Sophistree</h1>
      <p>Welcome to your argument mapping extension!</p>
    </div>
  )
}

export default App
EOF

# Create placeholder files for background and content scripts
touch src/background.ts src/content.ts

# Update package.json scripts
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.preview="vite preview"

# Set up TypeScript configuration
cat << EOF > tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat << EOF > tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

echo "Sophistree extension basic structure set up complete with Vite!"
EOF
