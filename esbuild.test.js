import * as esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/test/index.ts"],
  bundle: true,
  minify: false,
  sourcemap: false,
  outfile: "./temp/test.js",
  target: ["esnext"],
  external: ["@jest/globals"],
  loader: { ".ts": "ts" },
});
