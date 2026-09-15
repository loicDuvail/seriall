import * as esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/index.ts"],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: "./dist/bundle.js",
  target: ["esnext"],
  loader: { ".ts": "ts" },
});
