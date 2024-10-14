import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts", "e2e/windowWrapper.ts"],
  format: "iife",
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: "dist",
});
