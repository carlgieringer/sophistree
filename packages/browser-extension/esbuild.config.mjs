import chokidar from "chokidar";
import { build, context } from "esbuild";
import { clean } from "esbuild-plugin-clean";
import { copy } from "esbuild-plugin-copy";
import flow from "esbuild-plugin-flow";
import { sassPlugin } from "esbuild-sass-plugin";
import fs from "fs/promises";
import Handlebars from "handlebars";
import path from "path";
import glob from "glob";
import dotenv from "dotenv";
import { wasmLoader } from "esbuild-plugin-wasm";

const watch = process.argv.includes("--watch");
const prod = process.env.NODE_ENV === "production";
const outdir = prod ? "./dist/prod" : "./dist/dev";
const pdfjsSubdir = "pdfjs";

const options = {
  entryPoints: [
    "src/main.tsx",
    "src/background.ts",
    "src/content.ts",
    "src/options.tsx",
  ],
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
  target: ["chrome89", "firefox89"],
  format: "esm",
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
    ".mjs",
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
  define: makeEnvDefines(),
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
          from: ["./public/sidebar.html", "./public/options.html"],
          to: ["."],
        },
        {
          from: ["./public/logo*.png"],
          to: ["."],
        },
        {
          from: ["./public/pdfjs-dist/**/*"],
          to: [pdfjsSubdir],
        },
      ],
      verbose: true,
      watch,
    }),
    {
      name: "Delete PDF.js source maps (prod)",
      setup(build) {
        if (!prod) {
          return;
        }
        build.onEnd(async (result) => {
          if (result.errors.length > 0) return;

          const sourceMaps = glob.sync(
            path.join(outdir, pdfjsSubdir, "**/*.map"),
          );
          for (const map of sourceMaps) {
            await fs.unlink(map);
          }
        });
      },
    },
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
    wasmLoader(),
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

function makeEnvDefines() {
  const envFile =
    process.env.NODE_ENV === "production" ? ".env.production" : ".env";
  const envConfig = dotenv.config({ path: envFile }).parsed;

  const envDefines = {};
  for (const key in envConfig) {
    envDefines[`process.env.${key}`] = JSON.stringify(envConfig[key]);
  }

  envDefines["process.env.NODE_ENV"] = JSON.stringify(process.env.NODE_ENV);

  return envDefines;
}
