import * as esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/index.ts"],
  bundle: true,
  minify: false,
  sourcemap: false,
  outfile: "./dist/bundle.js",
  target: ["esnext"],
  loader: { ".ts": "ts" },
});
