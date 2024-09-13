import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, "public/sidebar.html"),
        background: resolve(__dirname, "src/background.ts"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        format: "iife",
        inlineDynamicImports: false,
      },
    },
    outDir: "dist",
    // Don't remove the manifest file
    emptyOutDir: false,
    sourcemap: true,
  },
  // Don't overwrite the manifest file
  publicDir: false,
});
