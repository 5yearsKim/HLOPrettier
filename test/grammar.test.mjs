import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import test from "node:test";

import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const { createOnigScanner, createOnigString, loadWASM } = oniguruma;
const { Registry } = textmate;

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const grammarPath = new URL("syntaxes/hlo.tmLanguage.json", root);
const fixturePath = new URL("test/fixtures/basic.hlo", root);
const typesFixturePath = new URL("test/fixtures/types.hlo", root);
const literalsFixturePath = new URL("test/fixtures/literals.hlo", root);
const syntaxFixturePath = new URL("test/fixtures/syntax.hlo", root);
const dumpsPath = new URL("samples/dumps/", root);

const wasm = await readFile(require.resolve("vscode-oniguruma/release/onig.wasm"));
await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));

const registry = new Registry({
  onigLib: Promise.resolve({ createOnigScanner, createOnigString }),
  loadGrammar: async (scopeName) => {
    if (scopeName !== "source.hlo") return null;
    return JSON.parse(await readFile(grammarPath, "utf8"));
  },
});

const grammar = await registry.loadGrammar("source.hlo");
assert.ok(grammar, "source.hlo grammar should load");

const fixture = await readFile(fixturePath, "utf8");
const lines = fixture.split(/\r?\n/);
const typesFixture = await readFile(typesFixturePath, "utf8");
const literalsFixture = await readFile(literalsFixturePath, "utf8");
const syntaxFixture = await readFile(syntaxFixturePath, "utf8");

let dumpFiles = [];
try {
  dumpFiles = (await readdir(dumpsPath)).filter((file) => file.endsWith(".txt"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

function lineContaining(text) {
  const line = lines.find((candidate) => candidate.includes(text));
  assert.ok(line, `fixture should contain ${JSON.stringify(text)}`);
  return line;
}

function assertScope(line, text, expectedScope, offsetWithinText = 0) {
  const start = line.indexOf(text);
  assert.notEqual(start, -1, `line should contain ${JSON.stringify(text)}`);

  const offset = start + offsetWithinText;
  const token = grammar
    .tokenizeLine(line)
    .tokens.find(({ startIndex, endIndex }) => startIndex <= offset && offset < endIndex);

  assert.ok(token, `token should exist at ${JSON.stringify(text)}`);
  assert.ok(
    token.scopes.includes(expectedScope),
    `${JSON.stringify(text)} should include ${expectedScope}; got ${token.scopes.join(", ")}`,
  );
}

function tokenizeDocument(source) {
  let ruleStack = null;
  return source.split(/\r?\n/).map((line) => {
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    return { line, tokens: result.tokens };
  });
}

test("highlights module declarations and primitive values", () => {
  const line = lineContaining("HloModule jit_example");
  assertScope(line, "HloModule", "keyword.declaration.module.hlo");
  assertScope(line, "jit_example", "entity.name.module.hlo");
  assertScope(line, "true", "constant.language.boolean.hlo");
  assertScope(line, "f32", "storage.type.numeric.hlo");
});

test("distinguishes computation declarations, instruction definitions, and references", () => {
  const computation = lineContaining("%sum (lhs:");
  assertScope(computation, "%sum", "entity.name.function.hlo");
  assertScope(computation, "lhs", "variable.parameter.hlo");
  assertScope(computation, "rhs", "variable.parameter.hlo");
  assertScope(computation, "f32", "storage.type.numeric.hlo");

  const entry = lineContaining("ENTRY %main");
  assertScope(entry, "ENTRY", "keyword.control.hlo");
  assertScope(entry, "%main", "entity.name.function.hlo");
  assertScope(entry, "input", "variable.parameter.hlo");

  const rootLine = lineContaining("ROOT %result");
  assertScope(rootLine, "ROOT", "keyword.control.hlo");
  assertScope(rootLine, "%result", "entity.name.variable.hlo");
  assertScope(rootLine, "%lhs", "variable.other.hlo");
});

test("highlights comments, strings, numbers, and punctuation", () => {
  const comment = lineContaining("// A compact fixture");
  assertScope(comment, "compact", "comment.line.double-slash.hlo");

  const metadata = lineContaining('op_name="input"');
  assertScope(metadata, '"input"', "string.quoted.double.hlo", 1);
  assertScope(metadata, "[32", "constant.numeric.hlo", 1);
  assertScope(metadata, "=", "punctuation.separator.hlo");

  const constant = lineContaining("constant(0.0)");
  assertScope(constant, "0.0", "constant.numeric.hlo");
});

test("highlights attribute names without a maintained attribute list", () => {
  const module = lineContaining("HloModule jit_example");
  assertScope(module, "is_scheduled", "variable.other.property.hlo");
  assertScope(module, "entry_computation_layout", "variable.other.property.hlo");

  const metadata = lineContaining('op_name="input"');
  assertScope(metadata, "metadata", "variable.other.property.hlo");
  assertScope(metadata, "op_name", "variable.other.property.hlo");

  const reduction = lineContaining("to_apply=%sum");
  assertScope(reduction, "dimensions", "variable.other.property.hlo");
  assertScope(reduction, "to_apply", "variable.other.property.hlo");
  assertScope(reduction, "%output", "entity.name.variable.hlo");
});

test("highlights every OpenXLA numeric primitive type", () => {
  const numericTypes = [
    "pred",
    "s1", "s2", "s4", "s8", "s16", "s32", "s64",
    "u1", "u2", "u4", "u8", "u16", "u32", "u64",
    "f16", "bf16", "f32", "f64",
    "f8e5m2", "f8e4m3", "f8e4m3fn", "f8e4m3b11fnuz", "f8e3m4",
    "f8e5m2fnuz", "f8e4m3fnuz", "f8e8m0fnu",
    "f6e3m2fn", "f6e2m3fn", "f4e2m1fn",
    "c64", "c128",
  ];

  for (const type of numericTypes) {
    const line = typesFixture.split(/\r?\n/).find((candidate) =>
      new RegExp(`(?:^|\\s)${type}\\[`).test(candidate),
    );
    assert.ok(line, `types fixture should contain ${type}`);
    assertScope(line, type, "storage.type.numeric.hlo");
  }
});

test("highlights OpenXLA structural primitive types", () => {
  const line = typesFixture.split(/\r?\n/).find((candidate) => candidate.startsWith("opaque"));
  assert.ok(line, "types fixture should contain structural types");

  for (const type of ["opaque", "token"]) {
    assertScope(line, type, "storage.type.hlo");
  }
});

test("highlights finite, non-finite, payload, and complex component literals", () => {
  const literalLines = literalsFixture.split(/\r?\n/);
  const cases = ["inf", "-inf", "nan", "nan(0x2a)", "-nan(0x2A)", "-1.25e+3"];

  for (const literal of cases) {
    const line = literalLines.find((candidate) => candidate.includes(`constant(${literal})`));
    assert.ok(line, `literal fixture should contain ${literal}`);
    assertScope(line, `constant(${literal}`, "constant.numeric.hlo", "constant(".length);
  }

  const complex = literalLines.find((candidate) => candidate.includes("constant((1.5"));
  assert.ok(complex, "literal fixture should contain a complex value");
  assertScope(complex, "1.5", "constant.numeric.hlo");
  assertScope(complex, "-2.25e-1", "constant.numeric.hlo");
});

test("highlights block comments, single-quoted strings, and shape syntax", () => {
  const rows = tokenizeDocument(syntaxFixture);
  const continuedComment = rows.find(({ line }) => line.includes("continue across lines"));
  assert.ok(continuedComment, "syntax fixture should contain a continued block comment");
  assert.ok(
    continuedComment.tokens.some(({ scopes }) => scopes.includes("comment.block.hlo")),
    "the second line of a block comment should retain comment.block.hlo",
  );

  const stringLine = rows.find(({ line }) => line.includes("'input\\nvalue'"))?.line;
  assert.ok(stringLine, "syntax fixture should contain a single-quoted string");
  assertScope(stringLine, "'input", "string.quoted.single.hlo", 1);
  assertScope(stringLine, "\\n", "constant.character.escape.hlo");

  const shapeLine = rows.find(({ line }) => line.includes("ENTRY %main"))?.line;
  assert.ok(shapeLine, "syntax fixture should contain a dynamic tiled shape");
  assertScope(shapeLine, "?", "constant.other.dynamic-dimension.hlo");
  assertScope(shapeLine, "<=", "punctuation.separator.hlo");
  assertScope(shapeLine, ":T(", "support.type.layout.hlo", 1);
  assertScope(shapeLine, "S(", "support.type.layout.hlo");
  assertScope(shapeLine, "->", "punctuation.separator.hlo");

  const punctuation = rows.find(({ line }) => line === "* # ~ + ...")?.line;
  assert.ok(punctuation, "syntax fixture should contain standalone punctuation");
  for (const symbol of ["*", "#", "~", "+", "..."]) {
    assertScope(punctuation, symbol, "punctuation.separator.hlo");
  }
});

test(
  "tokenizes every local XLA dump with expected structural scopes",
  { skip: dumpFiles.length === 0 },
  async () => {
    const startedAt = performance.now();

    for (const file of dumpFiles) {
      const source = await readFile(new URL(file, dumpsPath), "utf8");
      const rows = tokenizeDocument(source);
      const scopedText = (text, scope) => rows.some(({ line, tokens }) =>
        tokens.some((token) =>
          line.slice(token.startIndex, token.endIndex) === text && token.scopes.includes(scope),
        ),
      );

      assert.ok(scopedText("HloModule", "keyword.declaration.module.hlo"), `${file}: module keyword`);
      assert.ok(scopedText("ENTRY", "keyword.control.hlo"), `${file}: entry keyword`);
      assert.ok(scopedText("ROOT", "keyword.control.hlo"), `${file}: root keyword`);
      assert.ok(
        rows.some(({ tokens }) => tokens.some(({ scopes }) => scopes.includes("storage.type.numeric.hlo"))),
        `${file}: at least one primitive type`,
      );
    }

    const elapsedMs = performance.now() - startedAt;
    assert.ok(elapsedMs < 2000, `local dump tokenization took ${elapsedMs.toFixed(1)} ms`);
  },
);
