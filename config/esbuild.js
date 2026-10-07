import * as esbuild from "esbuild";

const common = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: false,
  minify: false,
  tsconfig: "config/tsconfig.json",
};

await Promise.all([
  esbuild.build({
    ...common,
    format: "esm",
    outfile: "dist/index.mjs",
  }),

  esbuild.build({
    ...common,
    format: "cjs",
    outfile: "dist/index.cjs",
  }),
]);
