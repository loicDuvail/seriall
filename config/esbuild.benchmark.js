import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/benchmark/benchmark.ts"],
  bundle: true,
  sourcemap: false,
  minify: false,
  format: "esm",
  outfile: "temp/benchmark.js",
  tsconfig: "config/tsconfig.json",
  platform: "node",
});
