import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/index.ts", "e2e/windowWrapper.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  // target: ["chrome58", "firefox57", "safari11", "edge16"],
  outdir: "dist",
});
