import ts from "rollup-plugin-ts";
export default {
  input: "src/index.ts",
  output: {
    file: "lib/pipe.js",
    format: "es",
  },
  plugins: [
    ts({
      /* Plugin options */
    }),
  ],
};
