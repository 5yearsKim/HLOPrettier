import { build } from "esbuild";

await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  external: ["vscode"],
  format: "cjs",
  logLevel: "info",
  outfile: "dist/extension.js",
  platform: "node",
  target: "node18",
});
