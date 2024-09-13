import { context } from "esbuild";
import { copy } from "esbuild-plugin-copy";

const watch = process.argv.includes("--watch");
const prod = process.env.NODE_ENV === "production";

const options = {
  entryPoints: ["src/main.tsx", "src/background.ts", "src/content.ts"],
  bundle: true,
  minify: true,
  sourcemap: prod ? false : "inline",
  target: ["chrome58", "firefox57"],
  outdir: "dist",
  loader: { ".ts": "tsx" },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  plugins: [
    {
      name: "build logging plugin",
      setup(build) {
        build.onStart(() => {
          console.log("build started");
        });
      },
    },
    copy({
      assets: [
        {
          from: [
            prod ? "./public/manifest.json" : "./public/manifest.dev.json",
          ],
          to: ["manifest.json"],
        },
        {
          from: ["./public/sidebar.html"],
          to: ["."],
        },
      ],
      verbose: true,
      watch,
    }),
  ],
};

const ctx = await context(options);
if (watch) {
  await ctx.watch();
}
