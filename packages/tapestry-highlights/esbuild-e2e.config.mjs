import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["e2e/windowWrapper.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: "dist-e2e",
});
