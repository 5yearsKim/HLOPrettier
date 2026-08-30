import { readFile } from "node:fs/promises";

const files = [
  "package.json",
  "language-configuration.json",
  "syntaxes/hlo.tmLanguage.json",
  ".vscode/extensions.json",
  ".vscode/launch.json",
  ".vscode/tasks.json",
  "tsconfig.json",
];

for (const file of files) {
  JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  console.log(`valid: ${file}`);
}
