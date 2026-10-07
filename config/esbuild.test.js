import * as esbuild from "esbuild";
import { TsconfigPathsPlugin } from "@esbuild-plugins/tsconfig-paths";

await esbuild.build({
  entryPoints: ["src/test/index.ts"],
  bundle: true,
  minify: false,
  sourcemap: false,
  outfile: "temp/test.js",
  target: "esnext",
  external: ["@jest/globals"],
  tsconfig: "config/tsconfig.json",
});
