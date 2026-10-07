import dts from "rollup-plugin-dts";

const common = {
  input: "src/index.ts",
  plugins: [
    dts({
      tsconfig: "config/tsconfig.json",
    }),
  ],
};

export default [
  {
    ...common,
    output: {
      file: "dist/index.d.mts",
      format: "es",
    },
  },
  {
    ...common,
    output: {
      file: "dist/index.d.cts",
      format: "es",
    },
  },
];
