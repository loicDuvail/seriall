import * as esbuild from "esbuild";

esbuild.build({
  entryPoints: ["./src/test/test.ts"],
  bundle: true,
  minify: false,
  sourcemap: false,
  outfile: "./test/test.js",
  target: ["esnext"],
  external: ["@jest/globals"],
  loader: { ".ts": "ts" },
});
