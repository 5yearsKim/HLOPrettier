import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("registers an HLO document formatting provider", async () => {
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const source = await readFile(new URL("src/extension.ts", root), "utf8");

  assert.equal(manifest.main, "./dist/extension.js");
  assert.ok(manifest.activationEvents.includes("onLanguage:hlo"));
  assert.match(source, /registerDocumentFormattingEditProvider\(\s*"hlo"/);
  assert.match(source, /provideDocumentFormattingEdits/);
});

test("contributes the documented HLO formatting settings", async () => {
  const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  const properties = manifest.contributes.configuration.properties;

  assert.equal(properties["hloPrettier.printWidth"].default, 120);
  assert.deepEqual(properties["hloPrettier.attributeWrapping"].enum, [
    "auto",
    "preserve",
    "onePerLine",
  ]);
  assert.equal(properties["hloPrettier.formatMetadata"].default, false);
  assert.equal(properties["hloPrettier.blankLinesBetweenComputations"].default, 1);

  for (const setting of Object.values(properties)) {
    assert.equal(setting.scope, "language-overridable");
  }
});
