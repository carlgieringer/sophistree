import { build, context } from "esbuild";

const watch = process.argv.includes("--watch");
const prod = process.env.NODE_ENV === "production";

const options = {
  entryPoints: ["src/index.ts"],
  platform: "node",
  target: "node22",
  outdir: "dist",
  format: "esm",
  sourcemap: prod ? false : "inline",
  minify: prod,
  plugins: [
    {
      name: "build logging plugin",
      setup(build) {
        build.onStart(() => {
          console.log("build started");
        });
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            console.log("build completed successfully");
          }
        });
      },
    },
  ],
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("watching...");
} else {
  const result = await build(options);
  if (result.errors.length > 0) {
    process.exit(1);
  }
}
