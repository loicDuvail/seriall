import * as esbuild from "esbuild";

const common = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: true,
  minify: false,
};

await Promise.all([
  esbuild.build({
    ...common,
    format: "esm",
    outfile: "dist/index.js",
  }),

  esbuild.build({
    ...common,
    format: "cjs",
    outfile: "dist/index.cjs",
  }),
]);
