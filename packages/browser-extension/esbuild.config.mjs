import chokidar from "chokidar";
import { build, context } from "esbuild";
import { clean } from "esbuild-plugin-clean";
import { copy } from "esbuild-plugin-copy";
import flow from "esbuild-plugin-flow";
import { sassPlugin } from "esbuild-sass-plugin";
import fs from "fs/promises";
import Handlebars from "handlebars";
import path from "path";

const watch = process.argv.includes("--watch");
const prod = process.env.NODE_ENV === "production";
const outdir = prod ? "./dist/prod" : "./dist/dev";

const options = {
  entryPoints: ["src/main.tsx", "src/background.ts", "src/content.ts"],
  bundle: true,
  minify: true,
  // React error messages are much more helpful when the Component names are not minimized
  keepNames: !prod,
  external: [
    // Required by cytoscape-elk
    "web-worker",
  ],
  alias: {
    "react-native": "react-native-web",
  },
  sourcemap: prod ? false : "inline",
  target: ["chrome58", "firefox57"],
  outdir,
  resolveExtensions: [
    ".web.tsx",
    ".tsx",
    ".web.ts",
    ".ts",
    ".web.jsx",
    ".jsx",
    ".web.js",
    ".js",
    ".css",
    ".json",
  ],
  loader: {
    ".ts": "tsx",
    ".js": "jsx",
    ".ttf": "file",
    ".png": "file",
  },
  assetNames: "assets/[name]-[hash]",
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
    clean({
      patterns: `${outdir}/*`,
    }),
    copy({
      assets: [
        {
          from: ["./public/sidebar.html"],
          to: ["."],
        },
        {
          from: ["./public/logo*.png"],
          to: ["."],
        },
        {
          from: ["./public/query-pdf.js"],
          to: ["."],
        },
      ],
      verbose: true,
      watch,
    }),
    sassPlugin(),
    flow(
      new RegExp(
        "/node_modules/react-native/|/node_modules/react-native-vector-icons/.*.js$",
      ),
    ),
    {
      name: "manifest Handlebars",
      setup(build) {
        const manifestTemplatePath = "./public/manifest.json.hbs";

        async function generateManifest() {
          try {
            const manifestTemplate = await fs.readFile(
              manifestTemplatePath,
              "utf-8",
            );
            const template = Handlebars.compile(manifestTemplate);

            const { version } = JSON.parse(
              await fs.readFile("./package.json", "utf-8"),
            );
            const manifestContent = template({
              version,
              prod,
            });

            const outDir = build.initialOptions.outdir;
            await fs.writeFile(
              path.join(outDir, "manifest.json"),
              manifestContent,
            );

            console.log("Manifest file generated successfully");
          } catch (error) {
            console.error("Error generating manifest:", error);
          }
        }

        if (watch) {
          const watcher = chokidar.watch(manifestTemplatePath, {
            persistent: true,
          });

          watcher.on("change", async () => {
            console.log("Manifest template changed, regenerating...");
            await generateManifest();
          });
        }

        build.onEnd(async (result) => {
          if (result.errors.length > 0) return;
          await generateManifest();
        });
      },
    },
  ],
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  let result = await build(options);
  console.log(result);
  if (result.errors.length) {
    throw new Error("build had errors");
  } else if (result.warnings.length) {
    throw new Error("build had warnings");
  }
}
